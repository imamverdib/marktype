import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const key = new PluginKey("mtActiveBlock");

/**
 * Marks the top-level block the caret sits in with `data-mt-active="true"`.
 *
 * That single attribute drives two Typora behaviours in CSS: the Markdown
 * marker that appears next to the active heading, and the dimming used by
 * focus mode.
 */
export const ActiveBlock = Extension.create({
  name: "activeBlock",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key,
        props: {
          decorations(state) {
            const { selection, doc } = state;
            // Anchored to the selection head, so it follows the caret while
            // the user extends a selection across blocks.
            const $head = selection.$head;
            if ($head.depth === 0) return DecorationSet.empty;

            const from = $head.before(1);
            const node = doc.nodeAt(from);
            if (!node) return DecorationSet.empty;

            return DecorationSet.create(doc, [
              Decoration.node(from, from + node.nodeSize, {
                "data-mt-active": "true",
              }),
            ]);
          },
        },
      }),
    ];
  },
});
