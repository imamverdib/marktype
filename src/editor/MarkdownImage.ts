import { mergeAttributes } from "@tiptap/core";
import Image from "@tiptap/extension-image";

import { resolveAssetSrc } from "@/lib/assets";

/**
 * Markdown stores whatever path the author wrote (`assets/shot.png`,
 * `/Users/…/shot.png`, `https://…`). WKWebView cannot load the first two, so
 * the DOM gets a resolved `asset:` URL while `src` — the value the Markdown
 * serializer reads — keeps the original text in `data-src`.
 */
export const MarkdownImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute("data-src") ?? element.getAttribute("src"),
        renderHTML: () => ({}),
      },
    };
  },

  renderHTML({ HTMLAttributes, node }) {
    const src = (node.attrs.src as string | null) ?? "";
    return [
      "img",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        src: resolveAssetSrc(src),
        "data-src": src,
        draggable: "false",
      }),
    ];
  },
});
