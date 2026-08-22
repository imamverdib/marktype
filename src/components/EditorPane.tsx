import type { Editor } from "@tiptap/core";
import { EditorContent } from "@tiptap/react";
import { ImageDown } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";

import { FormatBubble } from "./FormatBubble";
import { TableBubble } from "./TableBubble";
import { useHost } from "@/host/context";
import type { Preferences } from "@/lib/settings";
import { cn } from "@/lib/utils";

type EditorPaneProps = {
  editor: Editor;
  preferences: Preferences;
  /** Host-level drag state (the desktop shell watches native drag events). */
  dropping?: boolean;
  onEditLink: () => void;
};

const MARKDOWN_LINK = /\.(md|markdown|mdown|mkd|mdx|txt)$/i;
const IMAGE_MIME = /^image\//;

/** The writing surface: scroll container, floating menus and paste/drop glue. */
export function EditorPane({
  editor,
  preferences,
  dropping = false,
  onEditLink,
}: EditorPaneProps) {
  const host = useHost();
  const scroller = useRef<HTMLDivElement>(null);
  const [domDragging, setDomDragging] = useState(false);

  // Typewriter mode: hold the caret at a fixed height while typing.
  useEffect(() => {
    if (!preferences.typewriter) return;
    const centre = () => {
      const container = scroller.current;
      if (!container) return;
      const { head } = editor.state.selection;
      let caret: { top: number; bottom: number };
      try {
        caret = editor.view.coordsAtPos(head);
      } catch {
        return;
      }
      const box = container.getBoundingClientRect();
      const target = box.top + box.height * 0.42;
      const delta = (caret.top + caret.bottom) / 2 - target;
      if (Math.abs(delta) > 6) container.scrollBy({ top: delta, behavior: "auto" });
    };

    editor.on("selectionUpdate", centre);
    editor.on("update", centre);
    centre();
    return () => {
      editor.off("selectionUpdate", centre);
      editor.off("update", centre);
    };
  }, [editor, preferences.typewriter]);

  /** Links never navigate the webview; they open outside or load a sibling note. */
  const handleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const anchor = (event.target as HTMLElement).closest("a");
      const href = anchor?.getAttribute("href");
      if (!anchor || !href) return;

      // Plain clicks keep editing; ⌘-click follows the link, like Typora.
      if (!event.metaKey && !event.ctrlKey) return;
      event.preventDefault();

      if (/^[a-z][a-z0-9+.-]*:/i.test(href)) host.openExternal(href);
      else if (MARKDOWN_LINK.test(href)) host.openDocument?.(href);
      else host.openExternal(href);
    },
    [host],
  );

  /** Shared by paste and drop: bytes in, a Markdown-ready path out. */
  const insertImageFiles = useCallback(
    async (files: File[]) => {
      const images = files.filter((file) => IMAGE_MIME.test(file.type));
      if (images.length === 0) return false;

      for (const image of images) {
        try {
          const extension = image.type.split("/")[1]?.split("+")[0] || "png";
          const bytes = new Uint8Array(await image.arrayBuffer());
          const src = await host.saveImageBytes(bytes, extension);
          if (src) editor.chain().focus().setImage({ src, alt: "" }).run();
        } catch (error) {
          host.reportError("Could not insert image", error);
        }
      }
      return true;
    },
    [editor, host],
  );

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;

    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []);
      if (!files.some((file) => IMAGE_MIME.test(file.type))) return;
      event.preventDefault();
      void insertImageFiles(files);
    };

    // DOM drag & drop. Inert on the desktop build, where Tauri consumes the
    // drop natively to hand us real filesystem paths instead of bytes.
    const onDragOver = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) return;
      event.preventDefault();
      setDomDragging(true);
    };
    const onDragLeave = (event: DragEvent) => {
      if (event.relatedTarget && node.contains(event.relatedTarget as Node)) return;
      setDomDragging(false);
    };
    const onDrop = (event: DragEvent) => {
      const files = Array.from(event.dataTransfer?.files ?? []);
      setDomDragging(false);
      if (!files.some((file) => IMAGE_MIME.test(file.type))) return;
      event.preventDefault();
      void insertImageFiles(files);
    };

    node.addEventListener("paste", onPaste);
    node.addEventListener("dragover", onDragOver);
    node.addEventListener("dragleave", onDragLeave);
    node.addEventListener("drop", onDrop);
    return () => {
      node.removeEventListener("paste", onPaste);
      node.removeEventListener("dragover", onDragOver);
      node.removeEventListener("dragleave", onDragLeave);
      node.removeEventListener("drop", onDrop);
    };
  }, [insertImageFiles]);

  const showDropHint = dropping || domDragging;

  return (
    // The overlay is a sibling of the scroll container so it stays put while
    // the document scrolls underneath it.
    <div className="relative min-h-0 flex-1">
      <div
        ref={scroller}
        onClick={handleClick}
        className="absolute inset-0 overflow-y-auto"
      >
        <div
          className="mt-surface mx-auto w-full px-8 pt-10"
          style={{ maxWidth: "var(--mt-measure)" }}
          data-focus-mode={preferences.focusMode ? "true" : "false"}
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      <FormatBubble editor={editor} onEditLink={onEditLink} />
      <TableBubble editor={editor} />

      {showDropHint && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-30 m-3 flex items-center justify-center",
            "rounded-2xl border-2 border-dashed border-accent bg-accent-soft",
          )}
        >
          <span className="flex items-center gap-2 rounded-xl bg-panel px-3 py-2 text-[13px] font-medium text-ink-strong shadow-float">
            <ImageDown className="size-4 text-accent" />
            Drop images here
          </span>
        </div>
      )}
    </div>
  );
}
