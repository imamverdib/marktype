import { Extension } from "@tiptap/core";

export type ShortcutHandlers = {
  /** ⌘K — open the link editor. */
  onLink?: () => void;
  /** ⌘⌥I — insert an image. */
  onImage?: () => void;
  /** ⌘⌥M — insert a display formula. */
  onMath?: () => void;
};

/**
 * Editor-owned shortcuts for the actions that need UI outside the document.
 * The desktop build also exposes them through the native menu, which consumes
 * the key first; in a webview host this extension is the only binding.
 */
export const Shortcuts = Extension.create<ShortcutHandlers>({
  name: "marktypeShortcuts",

  addOptions() {
    return {};
  },

  addKeyboardShortcuts() {
    const run = (handler?: () => void) => () => {
      if (!handler) return false;
      handler();
      return true;
    };

    return {
      "Mod-k": run(this.options.onLink),
      "Mod-Alt-i": run(this.options.onImage),
      "Mod-Alt-m": run(this.options.onMath),
    };
  },
});
