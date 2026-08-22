import type { Editor } from "@tiptap/core";

export type OutlineItem = {
  id: string;
  level: number;
  text: string;
  pos: number;
};

/** Flat list of every heading in document order, for the sidebar. */
export function extractOutline(editor: Editor): OutlineItem[] {
  const items: OutlineItem[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== "heading") return;
    items.push({
      id: `${pos}-${node.attrs.level}`,
      level: Number(node.attrs.level) || 1,
      text: node.textContent.trim() || "Untitled section",
      pos,
    });
  });
  return items;
}

/** Index of the last heading at or above the caret. */
export function activeOutlineIndex(items: OutlineItem[], caret: number) {
  let active = -1;
  for (let index = 0; index < items.length; index += 1) {
    if (items[index].pos <= caret) active = index;
    else break;
  }
  return active;
}
