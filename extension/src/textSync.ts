import * as vscode from "vscode";

const isLowSurrogate = (code: number) => code >= 0xdc00 && code <= 0xdfff;

/**
 * Turns "the document should now read this" into the smallest single edit that
 * gets there.
 *
 * Replacing the whole file on every keystroke would work, but it floods the
 * undo stack and moves every other cursor in the file. Trimming the common
 * prefix and suffix keeps each edit the size of the actual change.
 */
export function diffEdit(document: vscode.TextDocument, next: string): vscode.TextEdit | null {
  const current = document.getText();
  if (current === next) return null;

  const limit = Math.min(current.length, next.length);
  let start = 0;
  while (start < limit && current.charCodeAt(start) === next.charCodeAt(start)) start += 1;
  // Never cut between the halves of a surrogate pair.
  if (start > 0 && isLowSurrogate(current.charCodeAt(start))) start -= 1;

  let endCurrent = current.length;
  let endNext = next.length;
  while (
    endCurrent > start &&
    endNext > start &&
    current.charCodeAt(endCurrent - 1) === next.charCodeAt(endNext - 1)
  ) {
    endCurrent -= 1;
    endNext -= 1;
  }
  if (endCurrent < current.length && isLowSurrogate(current.charCodeAt(endCurrent))) {
    endCurrent += 1;
    endNext += 1;
  }

  const range = new vscode.Range(
    document.positionAt(start),
    document.positionAt(endCurrent),
  );
  return vscode.TextEdit.replace(range, next.slice(start, endNext));
}

/** Applies `next` to the document, returning false when nothing changed. */
export async function applyText(
  document: vscode.TextDocument,
  next: string,
): Promise<boolean> {
  const edit = diffEdit(document, next);
  if (!edit) return false;

  const workspaceEdit = new vscode.WorkspaceEdit();
  workspaceEdit.replace(document.uri, edit.range, edit.newText);
  return vscode.workspace.applyEdit(workspaceEdit);
}
