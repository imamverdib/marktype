import type { Editor } from "@tiptap/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { useEffect, useState } from "react";

import { importImage, reportError } from "@/lib/files";

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|avif|bmp|heic)$/i;
const MARKDOWN_EXTENSIONS = /\.(md|markdown|mdown|mkd|mdx|txt)$/i;

type Options = {
  editor: Editor | null;
  documentPath: string | null;
  /** Called when a Markdown file is dropped instead of an image. */
  onOpenPath: (path: string) => void;
};

/**
 * Native drag & drop. Tauri hands us real filesystem paths (unlike the DOM
 * event), which is what makes portable relative image links possible.
 */
export function useFileDrop({ editor, documentPath, onOpenPath }: Options) {
  const [dropping, setDropping] = useState(false);

  useEffect(() => {
    if (!editor) return;

    const unlisten = getCurrentWebview().onDragDropEvent(async (event) => {
      const payload = event.payload;

      if (payload.type === "over" || payload.type === "enter") {
        setDropping(true);
        return;
      }
      if (payload.type === "leave") {
        setDropping(false);
        return;
      }

      setDropping(false);
      const paths = payload.paths ?? [];
      if (paths.length === 0) return;

      const markdown = paths.find((entry) => MARKDOWN_EXTENSIONS.test(entry));
      const images = paths.filter((entry) => IMAGE_EXTENSIONS.test(entry));

      if (images.length === 0 && markdown) {
        onOpenPath(markdown);
        return;
      }

      // Drop position is physical; ProseMirror wants CSS pixels.
      const ratio = window.devicePixelRatio || 1;
      const coords = {
        left: payload.position.x / ratio,
        top: payload.position.y / ratio,
      };
      const at = editor.view.posAtCoords(coords)?.pos;

      try {
        for (const image of images) {
          const src = await importImage(image, documentPath);
          const chain = editor.chain().focus();
          if (typeof at === "number") chain.setTextSelection(at);
          chain.setImage({ src, alt: "" }).run();
        }
      } catch (error) {
        await reportError("Could not insert image", error);
      }
    });

    return () => {
      void unlisten.then((off) => off());
    };
  }, [editor, documentPath, onOpenPath]);

  return dropping;
}
