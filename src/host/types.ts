/**
 * The editor core runs in three shells: the Tauri desktop window, the
 * Antigravity/VS Code webview, and a plain browser page. Everything they
 * disagree about — how a link opens, where a pasted image goes, how a local
 * path becomes a loadable URL — lives behind this adapter, so the editor itself
 * has no host imports.
 */
export type HostAdapter = {
  readonly kind: "desktop" | "editor-extension" | "browser";

  /** Opens an http(s) address outside the editor. */
  openExternal(href: string): void;

  /** Follows a link to another Markdown document, if the host supports it. */
  openDocument?(href: string): void;

  /**
   * Persists image bytes (a paste or a drop) and returns the path to write into
   * the Markdown, or `null` when the host could not store it.
   */
  saveImageBytes(bytes: Uint8Array, extension: string): Promise<string | null>;

  /**
   * Native image picker for Insert ▸ Image. Like `saveImageBytes`, it returns
   * the path to write into the Markdown — the host decides where the file goes.
   */
  pickImage(): Promise<string | null>;

  /** Surfaces a failure to the user in whatever way suits the host. */
  reportError(title: string, error: unknown): void;
};
