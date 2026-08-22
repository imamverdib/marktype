/**
 * Markdown image sources are whatever the author wrote: an absolute path, a
 * path relative to the document, or a remote URL. Only the host knows how to
 * turn the local ones into something its webview will actually load, so it
 * installs a resolver here and the shared image node calls through it.
 */
type LocalAssetResolver = (src: string) => string;

let resolveLocal: LocalAssetResolver = (src) => src;

export function setLocalAssetResolver(resolver: LocalAssetResolver) {
  resolveLocal = resolver;
}

const REMOTE_OR_INLINE = /^(data|blob|https?|asset|tauri|file|vscode-webview|vscode-resource):/i;

export function resolveAssetSrc(src: string | null | undefined): string {
  if (!src) return "";
  if (REMOTE_OR_INLINE.test(src) || src.startsWith("//")) return src;
  return resolveLocal(src);
}

/** Collapses `.` and `..` segments so a scope check sees a clean path. */
export function normalizePath(path: string) {
  const segments: string[] = [];
  for (const segment of path.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") segments.pop();
    else segments.push(segment);
  }
  return `${path.startsWith("/") ? "/" : ""}${segments.join("/")}`;
}
