import { convertFileSrc } from "@tauri-apps/api/core";

import { normalizePath, setLocalAssetResolver } from "./assets";
import { directoryName } from "./utils";

/**
 * Desktop asset resolution: relative paths are anchored to the open document's
 * folder and handed to Tauri's asset protocol, which is the only way WKWebView
 * will load a file from outside the bundle.
 */
export function setDocumentDir(documentPath: string | null) {
  const documentDir = documentPath ? directoryName(documentPath) : null;

  setLocalAssetResolver((src) => {
    const absolute = src.startsWith("/")
      ? src
      : documentDir
        ? normalizePath(`${documentDir}/${src}`)
        : null;
    if (!absolute) return src;
    try {
      return convertFileSrc(absolute);
    } catch {
      return src;
    }
  });
}
