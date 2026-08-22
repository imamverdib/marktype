import * as vscode from "vscode";

import { MarkTypeEditorProvider } from "./editorProvider";
import { VIEW_TYPE, type EditorCommand } from "./protocol";
import { toggleSetting } from "./settings";
import { StatusBar } from "./statusBar";

/** Commands that simply forward an action to the focused MarkType tab. */
const FORWARDED: EditorCommand[] = [
  "bold",
  "italic",
  "underline",
  "strike",
  "highlight",
  "code",
  "link",
  "paragraph",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "clear-format",
  "bullet-list",
  "ordered-list",
  "task-list",
  "blockquote",
  "code-block",
  "table",
  "math-block",
  "image",
  "horizontal-rule",
];

export function activate(context: vscode.ExtensionContext) {
  const statusBar = new StatusBar();
  const mediaRoot = vscode.Uri.joinPath(context.extensionUri, "media");
  const provider = new MarkTypeEditorProvider(mediaRoot, statusBar);

  context.subscriptions.push(
    statusBar,
    vscode.window.registerCustomEditorProvider(VIEW_TYPE, provider, {
      // An editor should survive being sent to a background tab.
      webviewOptions: { retainContextWhenHidden: true, enableFindWidget: true },
      supportsMultipleEditorsPerDocument: false,
    }),
  );

  const register = (id: string, handler: (...args: unknown[]) => unknown) =>
    context.subscriptions.push(vscode.commands.registerCommand(id, handler));

  register("marktype.openEditor", (uri) =>
    openWith(resolveUri(uri), VIEW_TYPE, "MarkType has no Markdown file to open."),
  );
  register("marktype.openSource", (uri) =>
    openWith(resolveUri(uri), "default", "There is no document to show the source of."),
  );

  register("marktype.save", async () => {
    // Pull the last keystrokes out of the webview before writing the file.
    if (!(await provider.saveActive())) {
      await vscode.commands.executeCommand("workbench.action.files.save");
    }
  });

  register("marktype.toggleOutline", () => toggleSetting("showOutline"));
  register("marktype.toggleTypewriterMode", () => toggleSetting("typewriterMode"));
  register("marktype.toggleFocusMode", () => toggleSetting("focusMode"));

  for (const command of FORWARDED) {
    register(`marktype.${command}`, () => provider.send(command));
  }

  // Bound to the keys the editor itself handles, so the IDE's own shortcuts for
  // those keys (⌘B for the side bar, ⌘K's chord, ⌘Z's document undo) stay out
  // of the way while a MarkType tab has focus. Doing nothing is the point.
  register("marktype.internal.consumeKeybinding", () => undefined);
}

export function deactivate() {
  // Everything lives on context.subscriptions.
}

function resolveUri(argument: unknown): vscode.Uri | undefined {
  if (argument instanceof vscode.Uri) return argument;

  const active = vscode.window.activeTextEditor;
  if (active) return active.document.uri;

  const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
  if (input && typeof input === "object" && "uri" in input) {
    const candidate = (input as { uri?: unknown }).uri;
    if (candidate instanceof vscode.Uri) return candidate;
  }
  return undefined;
}

async function openWith(uri: vscode.Uri | undefined, viewType: string, complaint: string) {
  if (!uri) {
    void vscode.window.showInformationMessage(complaint);
    return;
  }
  await vscode.commands.executeCommand("vscode.openWith", uri, viewType);
}
