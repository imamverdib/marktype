import * as vscode from "vscode";

import { pickAndCopyImage, saveImageBytes } from "./images";
import {
  VIEW_TYPE,
  type AssetBase,
  type EditorCommand,
  type HostMessage,
  type WebviewMessage,
} from "./protocol";
import { readSettings } from "./settings";
import { StatusBar } from "./statusBar";
import { applyText } from "./textSync";
import { editorHtml } from "./webviewHtml";

/** Edits are batched: one document edit per burst of typing, not per keystroke. */
const EDIT_DEBOUNCE_MS = 180;

/**
 * One open MarkType tab.
 *
 * The invariant that keeps the two sides from fighting is `webviewText`: the
 * text the webview is known to hold. A document change is only pushed when it
 * differs from that, which is what stops our own edits from echoing back.
 */
class EditorSession implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private webviewText: string;
  private pendingEdit: ReturnType<typeof setTimeout> | undefined;
  private pendingText: string | null = null;
  private flushToken = 0;
  private readonly flushWaiters = new Map<number, (text: string) => void>();

  constructor(
    private readonly document: vscode.TextDocument,
    private readonly panel: vscode.WebviewPanel,
    private readonly mediaRoot: vscode.Uri,
    private readonly statusBar: StatusBar,
    private readonly onActivated: (session: EditorSession | undefined) => void,
  ) {
    this.webviewText = document.getText();
  }

  get uri() {
    return this.document.uri;
  }

  start() {
    const { webview } = this.panel;
    webview.options = {
      enableScripts: true,
      localResourceRoots: this.resourceRoots(),
    };
    webview.html = editorHtml(webview, this.mediaRoot);

    this.disposables.push(
      webview.onDidReceiveMessage((message: WebviewMessage) =>
        this.handleMessage(message),
      ),
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.uri.toString() !== this.document.uri.toString()) return;
        const text = event.document.getText();
        if (text === this.webviewText) return;
        this.webviewText = text;
        this.post({ type: "document", text });
      }),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (!event.affectsConfiguration("marktype") && !event.affectsConfiguration("editor.font"))
          return;
        this.post({ type: "settings", settings: readSettings(this.document.uri) });
      }),
      this.panel.onDidChangeViewState(() => this.syncActivation()),
      this.panel.onDidDispose(() => this.dispose()),
    );

    this.syncActivation();
  }

  /** Webviews may only load local files from these folders. */
  private resourceRoots(): vscode.Uri[] {
    const roots = [this.mediaRoot];
    const folder = vscode.workspace.getWorkspaceFolder(this.document.uri);
    if (folder) roots.push(folder.uri);
    if (this.document.uri.scheme === "file") {
      roots.push(vscode.Uri.joinPath(this.document.uri, ".."));
    }
    return roots;
  }

  private assetBase(): AssetBase {
    const { webview } = this.panel;
    const folder = vscode.workspace.getWorkspaceFolder(this.document.uri);
    const toWebviewUri = (uri: vscode.Uri) => {
      try {
        return webview.asWebviewUri(uri).toString();
      } catch {
        return null;
      }
    };

    return {
      documentDir:
        this.document.uri.scheme === "file"
          ? toWebviewUri(vscode.Uri.joinPath(this.document.uri, ".."))
          : null,
      workspaceRoot: folder ? toWebviewUri(folder.uri) : null,
    };
  }

  private syncActivation() {
    if (this.panel.active) {
      this.onActivated(this);
      this.statusBar.show();
    } else {
      this.statusBar.hide();
    }
  }

  post(message: HostMessage) {
    void this.panel.webview.postMessage(message);
  }

  command(command: EditorCommand) {
    this.post({ type: "command", command });
  }

  /** Asks the webview for its current text and applies it before saving. */
  async flush(): Promise<void> {
    if (this.pendingEdit) {
      clearTimeout(this.pendingEdit);
      this.pendingEdit = undefined;
    }

    const token = (this.flushToken += 1);
    const text = await new Promise<string | null>((resolve) => {
      const timer = setTimeout(() => {
        this.flushWaiters.delete(token);
        resolve(this.pendingText);
      }, 500);
      this.flushWaiters.set(token, (value) => {
        clearTimeout(timer);
        resolve(value);
      });
      this.post({ type: "flush", token });
    });

    this.pendingText = null;
    if (text !== null) await this.commit(text);
  }

  private async handleMessage(message: WebviewMessage) {
    switch (message.type) {
      case "ready":
        this.webviewText = this.document.getText();
        this.post({
          type: "init",
          text: this.webviewText,
          settings: readSettings(this.document.uri),
          assetBase: this.assetBase(),
          readOnly: vscode.workspace.fs.isWritableFileSystem(this.document.uri.scheme) === false,
        });
        return;

      case "change":
        this.pendingText = message.text;
        if (this.pendingEdit) clearTimeout(this.pendingEdit);
        this.pendingEdit = setTimeout(() => {
          this.pendingEdit = undefined;
          const text = this.pendingText;
          this.pendingText = null;
          if (text !== null) void this.commit(text);
        }, EDIT_DEBOUNCE_MS);
        return;

      case "flushed": {
        const waiter = this.flushWaiters.get(message.token);
        this.flushWaiters.delete(message.token);
        waiter?.(message.text);
        return;
      }

      case "stats":
        this.statusBar.update(message);
        return;

      case "openExternal":
        void vscode.env.openExternal(vscode.Uri.parse(message.href));
        return;

      case "openDocument": {
        const target = message.href.startsWith("/")
          ? vscode.Uri.file(message.href)
          : vscode.Uri.joinPath(this.document.uri, "..", ...message.href.split("/"));
        void vscode.commands.executeCommand("vscode.openWith", target, VIEW_TYPE);
        return;
      }

      case "saveImage":
        try {
          const src = await saveImageBytes(
            this.document,
            new Uint8Array(message.bytes),
            message.extension,
          );
          this.post({ type: "reply", id: message.id, src });
        } catch (error) {
          this.post({ type: "reply", id: message.id, src: null });
          void vscode.window.showErrorMessage(`MarkType could not save the image: ${error}`);
        }
        return;

      case "pickImage":
        try {
          this.post({
            type: "reply",
            id: message.id,
            src: await pickAndCopyImage(this.document),
          });
        } catch (error) {
          this.post({ type: "reply", id: message.id, src: null });
          void vscode.window.showErrorMessage(`MarkType could not insert the image: ${error}`);
        }
        return;

      case "error":
        void vscode.window.showErrorMessage(`MarkType: ${message.message}`);
        return;
    }
  }

  /** Writes the webview's text into the document as one minimal edit. */
  private async commit(text: string) {
    if (text === this.document.getText()) {
      this.webviewText = text;
      return;
    }
    this.webviewText = text;
    const applied = await applyText(this.document, text);
    if (!applied) {
      // The edit was rejected (a read-only file, or a racing change); resync.
      this.webviewText = this.document.getText();
      this.post({ type: "document", text: this.webviewText });
    }
  }

  dispose() {
    if (this.pendingEdit) clearTimeout(this.pendingEdit);
    while (this.disposables.length) this.disposables.pop()?.dispose();
    this.statusBar.hide();
    this.onActivated(undefined);
  }
}

/** Registers the custom editor and keeps track of which tab is in front. */
export class MarkTypeEditorProvider implements vscode.CustomTextEditorProvider {
  private activeSession: EditorSession | undefined;

  constructor(
    private readonly mediaRoot: vscode.Uri,
    private readonly statusBar: StatusBar,
  ) {}

  resolveCustomTextEditor(
    document: vscode.TextDocument,
    panel: vscode.WebviewPanel,
  ): void {
    const session = new EditorSession(
      document,
      panel,
      this.mediaRoot,
      this.statusBar,
      (active) => {
        if (active) this.activeSession = active;
        else if (this.activeSession?.uri.toString() === document.uri.toString()) {
          this.activeSession = undefined;
        }
      },
    );
    session.start();
  }

  /** Routes a command to the tab the user is looking at. */
  send(command: EditorCommand) {
    this.activeSession?.command(command);
  }

  async saveActive() {
    const session = this.activeSession;
    if (!session) return false;
    await session.flush();
    const document = vscode.workspace.textDocuments.find(
      (candidate) => candidate.uri.toString() === session.uri.toString(),
    );
    return document ? document.save() : false;
  }

  get hasActive() {
    return this.activeSession !== undefined;
  }
}
