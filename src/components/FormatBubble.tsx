import type { Editor } from "@tiptap/core";
import { BubbleMenu } from "@tiptap/react/menus";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Code,
  Highlighter,
  Italic,
  Link2,
  Strikethrough,
  Underline as UnderlineIcon,
} from "lucide-react";

import { Button } from "./ui/Button";
import { cn } from "@/lib/utils";

type FormatBubbleProps = {
  editor: Editor;
  onEditLink: () => void;
};

/** Selection toolbar. Appears only for real text selections. */
export function FormatBubble({ editor, onEditLink }: FormatBubbleProps) {
  const active = useEditorState({
    editor,
    selector: ({ editor: instance }) => ({
      bold: instance.isActive("bold"),
      italic: instance.isActive("italic"),
      underline: instance.isActive("underline"),
      strike: instance.isActive("strike"),
      code: instance.isActive("code"),
      highlight: instance.isActive("highlight"),
      link: instance.isActive("link"),
    }),
  });

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="formatBubble"
      updateDelay={80}
      options={{ placement: "top", offset: 8, flip: true, shift: true }}
      shouldShow={({ editor: instance, state, from, to }) => {
        if (!instance.isEditable) return false;
        if (from === to) return false;
        if (instance.isActive("codeBlock")) return false;
        // Node selections (an image, a formula) get their own affordances.
        return !state.selection.empty && state.doc.textBetween(from, to).trim().length > 0;
      }}
      className={cn(
        "flex items-center gap-0.5 rounded-xl border border-edge bg-panel p-1 shadow-float",
      )}
    >
      <Button
        size="icon-sm"
        active={active.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
        aria-label="Bold"
      >
        <Bold className="size-3.5" />
      </Button>
      <Button
        size="icon-sm"
        active={active.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Italic"
      >
        <Italic className="size-3.5" />
      </Button>
      <Button
        size="icon-sm"
        active={active.underline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        aria-label="Underline"
      >
        <UnderlineIcon className="size-3.5" />
      </Button>
      <Button
        size="icon-sm"
        active={active.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        aria-label="Strikethrough"
      >
        <Strikethrough className="size-3.5" />
      </Button>
      <Button
        size="icon-sm"
        active={active.highlight}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        aria-label="Highlight"
      >
        <Highlighter className="size-3.5" />
      </Button>
      <Button
        size="icon-sm"
        active={active.code}
        onClick={() => editor.chain().focus().toggleCode().run()}
        aria-label="Inline code"
      >
        <Code className="size-3.5" />
      </Button>
      <span className="mx-0.5 h-4 w-px bg-edge" />
      <Button size="icon-sm" active={active.link} onClick={onEditLink} aria-label="Link">
        <Link2 className="size-3.5" />
      </Button>
    </BubbleMenu>
  );
}
