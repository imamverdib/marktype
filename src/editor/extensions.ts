import type { Extensions } from "@tiptap/core";
import { Markdown } from "@tiptap/markdown";
import { ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Highlight from "@tiptap/extension-highlight";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";

import { ActiveBlock } from "./ActiveBlock";
import { CodeBlockView } from "./CodeBlockView";
import { MarkdownImage } from "./MarkdownImage";
import { Shortcuts, type ShortcutHandlers } from "./Shortcuts";
import { TyporaBlockMath, TyporaInlineMath } from "./math";
import { lowlight } from "./lowlight";

const CodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
}).configure({
  lowlight,
  // No default language: an unlabelled fence should stay unlabelled in the
  // Markdown the user gets back.
  defaultLanguage: null,
  languageClassPrefix: "language-",
});

const placeholderFor = ({ node, pos }: { node: { type: { name: string } }; pos: number }) => {
  if (node.type.name === "heading") return "Heading";
  if (node.type.name === "codeBlock") return "";
  return pos === 0 ? "Start writing — Markdown works as you type…" : "";
};

/**
 * The editor's extension set. Markdown parsing/serialization comes from
 * `@tiptap/markdown`, so everything here only has to describe the schema and
 * the typing behaviour; the round-trip is handled upstream.
 */
export function buildExtensions(shortcuts: ShortcutHandlers = {}): Extensions {
  return [
    StarterKit.configure({
      // Replaced by the lowlight-backed fence above.
      codeBlock: false,
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      link: {
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: null },
      },
      dropcursor: { color: "var(--mt-accent)", width: 2 },
      undoRedo: { depth: 200, newGroupDelay: 400 },
    }),
    CodeBlock,
    Markdown.configure({ indentation: { style: "space", size: 2 } }),
    Highlight.configure({ multicolor: false }),
    TaskList,
    TaskItem.configure({ nested: true }),
    TableKit.configure({
      table: { resizable: true, lastColumnResizable: false, allowTableNodeSelection: true },
    }),
    MarkdownImage.configure({ inline: false, allowBase64: true }),
    TyporaInlineMath,
    TyporaBlockMath,
    Placeholder.configure({ placeholder: placeholderFor, includeChildren: false }),
    CharacterCount.configure({ limit: null }),
    ActiveBlock,
    Shortcuts.configure(shortcuts),
  ];
}
