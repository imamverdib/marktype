import * as vscode from "vscode";

import { imageFolder } from "./settings";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "bmp"];

/** Folder that images for `document` are copied into, plus its relative name. */
function targetFolder(document: vscode.TextDocument) {
  const folder = imageFolder(document.uri);
  return {
    uri: vscode.Uri.joinPath(document.uri, "..", ...folder.split("/")),
    relative: folder,
  };
}

async function ensureFolder(uri: vscode.Uri) {
  // createDirectory is recursive and a no-op when the folder already exists.
  await vscode.workspace.fs.createDirectory(uri);
}

/** Writes pasted or dropped bytes next to the document, Markdown path out. */
export async function saveImageBytes(
  document: vscode.TextDocument,
  bytes: Uint8Array,
  extension: string,
): Promise<string> {
  const safeExtension = /^[a-z0-9]{1,5}$/i.test(extension) ? extension.toLowerCase() : "png";
  const { uri, relative } = targetFolder(document);
  await ensureFolder(uri);

  const name = `pasted-${Date.now().toString(36)}.${safeExtension}`;
  await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(uri, name), bytes);
  return `${relative}/${name}`;
}

/** Native picker for Insert ▸ Image; copies the choice next to the document. */
export async function pickAndCopyImage(
  document: vscode.TextDocument,
): Promise<string | null> {
  const picked = await vscode.window.showOpenDialog({
    canSelectMany: false,
    openLabel: "Insert",
    filters: { Images: IMAGE_EXTENSIONS },
  });
  const source = picked?.[0];
  if (!source) return null;

  const { uri, relative } = targetFolder(document);
  await ensureFolder(uri);

  const name = source.path.split("/").pop() || `image-${Date.now().toString(36)}.png`;
  let target = vscode.Uri.joinPath(uri, name);
  try {
    await vscode.workspace.fs.stat(target);
    // Taken: keep both files rather than overwriting someone's image.
    const dot = name.lastIndexOf(".");
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const extension = dot > 0 ? name.slice(dot) : "";
    const unique = `${stem}-${Date.now().toString(36)}${extension}`;
    target = vscode.Uri.joinPath(uri, unique);
    await vscode.workspace.fs.copy(source, target);
    return `${relative}/${unique}`;
  } catch {
    await vscode.workspace.fs.copy(source, target);
    return `${relative}/${name}`;
  }
}
