import type { HostAdapter } from "@/host/types";
import { setLocalAssetResolver } from "@/lib/assets";

/**
 * Browser host. There is no filesystem to copy an image into, so pasted and
 * dropped images are inlined as data URIs — the Markdown stays self-contained,
 * which is what you want from a document you are about to download anyway.
 */
const IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  avif: "image/avif",
  bmp: "image/bmp",
};

function toDataUri(bytes: Uint8Array, extension: string) {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  const mime = IMAGE_MIME[extension.toLowerCase()] ?? "application/octet-stream";
  return `data:${mime};base64,${btoa(binary)}`;
}

function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.style.display = "none";
    input.addEventListener("change", () => {
      resolve(input.files?.[0] ?? null);
      input.remove();
    });
    // Cancelling a file dialog fires no event in every browser; the element is
    // cheap to leave behind and is replaced on the next pick.
    document.body.append(input);
    input.click();
  });
}

export function createBrowserHost(
  notify: (message: string, tone?: "info" | "error") => void,
): HostAdapter {
  // Data URIs and remote URLs pass straight through; nothing else can be loaded.
  setLocalAssetResolver((src) => src);

  return {
    kind: "browser",

    openExternal: (href) => {
      window.open(href, "_blank", "noopener,noreferrer");
    },

    saveImageBytes: async (bytes, extension) => toDataUri(bytes, extension),

    pickImage: async () => {
      const file = await pickFile("image/*");
      if (!file) return null;
      const extension = file.name.split(".").pop() || "png";
      return toDataUri(new Uint8Array(await file.arrayBuffer()), extension);
    },

    reportError: (title, error) => {
      notify(`${title}: ${error instanceof Error ? error.message : String(error)}`, "error");
    },
  };
}
