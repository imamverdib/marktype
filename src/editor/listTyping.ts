import { Extension, InputRule } from "@tiptap/core";

/** `[ ]`, `[x]` or `[X]` followed by a space, at the start of a list item. */
const CHECKBOX = /^\[([ xX])?\]\s$/;

const ITEM_TYPES = new Set(["listItem", "taskItem"]);

/**
 * Two list behaviours that a Typora user expects and TipTap does not ship.
 *
 * 1. `- [ ] ` makes a task list. Upstream only converts a bare `[ ] ` in a
 *    paragraph: by the time the brackets are typed, `- ` has already turned the
 *    line into a bullet item, and wrapping that in a task item is not a valid
 *    move, so nothing happens. Reading the same text from a file *does* give a
 *    task list, so typing and parsing disagreed.
 * 2. Enter on an empty item leaves the list, instead of adding another empty
 *    item you then have to delete.
 */
export const ListTyping = Extension.create({
  name: "listTyping",

  // Ahead of the list extensions, so the bullet item is converted rather than
  // the upstream rule failing silently.
  priority: 200,

  addInputRules() {
    return [
      new InputRule({
        find: CHECKBOX,
        handler: ({ state, range, match, chain }) => {
          const $from = state.doc.resolve(range.from);

          // Only inside a plain bullet item; anywhere else upstream handles it.
          let insideBulletList = false;
          for (let depth = $from.depth; depth > 0; depth -= 1) {
            const name = $from.node(depth).type.name;
            if (name === "taskList" || name === "orderedList") return null;
            if (name === "bulletList") {
              insideBulletList = true;
              break;
            }
          }
          if (!insideBulletList) return null;

          const checked = match[1]?.toLowerCase() === "x";
          chain()
            .deleteRange(range)
            .toggleTaskList()
            .updateAttributes("taskItem", { checked })
            .run();
          return undefined;
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { selection } = this.editor.state;
        if (!selection.empty) return false;

        const { $from } = selection;
        for (let depth = $from.depth; depth > 0; depth -= 1) {
          const node = $from.node(depth);
          if (!ITEM_TYPES.has(node.type.name)) continue;
          // Only an item with nothing in it; anything else splits as usual.
          if (node.textContent.length > 0 || node.childCount > 1) return false;
          return this.editor.commands.liftListItem(node.type.name);
        }
        return false;
      },
    };
  },
});
