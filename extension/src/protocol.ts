/**
 * The webview/extension-host contract. Types only plus a couple of literals, so
 * the same file compiles into the CommonJS host bundle and the ESM webview
 * bundle.
 */

export const VIEW_TYPE = "marktype.editor";

/** Editor actions the host can trigger from a command or keybinding. */
export type EditorCommand =
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "highlight"
  | "code"
  | "link"
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "clear-format"
  | "bullet-list"
  | "ordered-list"
  | "task-list"
  | "blockquote"
  | "code-block"
  | "table"
  | "math-block"
  | "image"
  | "horizontal-rule"
  | "toggle-typewriter"
  | "toggle-focus-mode";

export type WebviewSettings = {
  fontFamily: "editor" | "sans" | "serif" | "mono";
  /** 0 means "follow the IDE's editor font size". */
  fontSize: number;
  editorFontSize: number;
  editorFontFamily: string;
  lineWidth: number;
  typewriter: boolean;
  focusMode: boolean;
  spellcheck: boolean;
};

/** Webview URIs the image resolver anchors relative Markdown paths to. */
export type AssetBase = {
  /** The open document's folder. */
  documentDir: string | null;
  /** The workspace folder, for Markdown that links from the repository root. */
  workspaceRoot: string | null;
};

export type HostMessage =
  | {
      type: "init";
      text: string;
      settings: WebviewSettings;
      assetBase: AssetBase;
      readOnly: boolean;
    }
  | { type: "document"; text: string }
  | { type: "settings"; settings: WebviewSettings }
  | { type: "command"; command: EditorCommand }
  | { type: "flush"; token: number }
  | { type: "reply"; id: number; src: string | null }
  | { type: "notice"; message: string; tone: "info" | "error" };

export type WebviewMessage =
  | { type: "ready" }
  | { type: "change"; text: string }
  | { type: "flushed"; token: number; text: string }
  | { type: "stats"; words: number; characters: number; readingMinutes: number }
  | { type: "openExternal"; href: string }
  | { type: "openDocument"; href: string }
  | { type: "saveImage"; id: number; bytes: number[]; extension: string }
  | { type: "pickImage"; id: number }
  | { type: "error"; message: string };
