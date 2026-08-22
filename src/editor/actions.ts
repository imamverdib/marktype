import type { Editor } from "@tiptap/core";

export type EditorActionHooks = {
  /** Opens the link editor for the current selection. */
  promptLink: () => void;
  /** Opens the native image picker and inserts the result. */
  promptImage: () => void;
  /** Opens the LaTeX editor for a freshly inserted block formula. */
  promptMath: () => void;
};

const HEADING_LEVELS: Record<string, 1 | 2 | 3 | 4 | 5 | 6> = {
  h1: 1,
  h2: 2,
  h3: 3,
  h4: 4,
  h5: 5,
  h6: 6,
};

/**
 * Applies the editor-side half of the action vocabulary, whether it arrived
 * from the desktop menu or an IDE command. Returns `false` for actions the
 * surrounding app owns (files, view toggles).
 */
export function runEditorAction(
  editor: Editor,
  action: string,
  hooks: EditorActionHooks,
): boolean {
  const chain = () => editor.chain().focus();

  const level = HEADING_LEVELS[action];
  if (level) {
    chain().toggleHeading({ level }).run();
    return true;
  }

  switch (action) {
    case "bold":
      chain().toggleBold().run();
      return true;
    case "italic":
      chain().toggleItalic().run();
      return true;
    case "underline":
      chain().toggleUnderline().run();
      return true;
    case "strike":
      chain().toggleStrike().run();
      return true;
    case "highlight":
      chain().toggleHighlight().run();
      return true;
    case "code":
      chain().toggleCode().run();
      return true;
    case "link":
      hooks.promptLink();
      return true;
    case "paragraph":
      chain().setParagraph().run();
      return true;
    case "clear-format":
      chain().unsetAllMarks().clearNodes().run();
      return true;
    case "bullet-list":
      chain().toggleBulletList().run();
      return true;
    case "ordered-list":
      chain().toggleOrderedList().run();
      return true;
    case "task-list":
      chain().toggleTaskList().run();
      return true;
    case "blockquote":
      chain().toggleBlockquote().run();
      return true;
    case "code-block":
      chain().toggleCodeBlock().run();
      return true;
    case "table":
      chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      return true;
    case "math-block":
      hooks.promptMath();
      return true;
    case "image":
      hooks.promptImage();
      return true;
    case "horizontal-rule":
      chain().setHorizontalRule().run();
      return true;
    default:
      return false;
  }
}
