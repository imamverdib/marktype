import { InputRule } from "@tiptap/core";
import { BlockMath, InlineMath } from "@tiptap/extension-mathematics";

import { emitMathClick } from "./mathBridge";

const KATEX_OPTIONS = { throwOnError: false, strict: false as const };

/** `$5` and `$1,200` are money, not maths — don't swallow them. */
const looksLikeCurrency = (latex: string) => /^[\d.,\s]+$/.test(latex);

/**
 * Stricter than the shipped tokenizer, which happily reads "$5 and $10" as one
 * formula and drops the space while re-serializing it. A `$…$` span only counts
 * as maths when it hugs its delimiters and does not run into a digit, which is
 * how every Markdown-with-maths implementation disambiguates prices.
 */
const INLINE_MATH = /^\$([^\s$][^$\n]*[^\s$]|[^\s$])\$(?![\d$])/;

/**
 * The shipped input rules use `$$…$$` for inline and `$$$…$$$` for block maths.
 * Typora — and the Markdown these files have to round-trip through — uses
 * `$…$` inline and `$$…$$` for display, so both rules are replaced here.
 * Parsing and serialization already follow that convention upstream.
 */
export const TyporaInlineMath = InlineMath.extend({
  markdownTokenizer: {
    name: "inlineMath",
    level: "inline",
    start: (src: string) => src.indexOf("$"),
    tokenize: (src: string) => {
      const match = src.match(INLINE_MATH);
      if (!match) return undefined;
      const latex = match[1];
      if (looksLikeCurrency(latex)) return undefined;
      return { type: "inlineMath", raw: match[0], latex };
    },
  },

  addInputRules() {
    return [
      new InputRule({
        find: /(?<!\$)\$([^\s$][^$\n]*?)\$$/,
        handler: ({ state, range, match }) => {
          const latex = match[1];
          if (!latex || looksLikeCurrency(latex)) return null;
          state.tr.replaceWith(range.from, range.to, this.type.create({ latex }));
          return undefined;
        },
      }),
    ];
  },
}).configure({
  katexOptions: KATEX_OPTIONS,
  onClick: (node, pos) =>
    emitMathClick({ kind: "inline", latex: node.attrs.latex ?? "", pos }),
});

export const TyporaBlockMath = BlockMath.extend({
  addInputRules() {
    return [
      new InputRule({
        find: /^\$\$([^$]+)\$\$$/,
        handler: ({ state, range, match }) => {
          const latex = match[1];
          if (!latex) return null;
          const { tr } = state;
          const $from = state.doc.resolve(range.from);
          const node = this.type.create({ latex });
          // Replace the whole paragraph when the formula is all it contains,
          // so no empty block is left behind.
          const fillsBlock =
            $from.depth > 0 &&
            $from.parent.isTextblock &&
            range.from === $from.start() &&
            range.to === $from.end();
          const canSwapBlock =
            fillsBlock &&
            $from
              .node(-1)
              .canReplaceWith($from.index(-1), $from.indexAfter(-1), this.type);
          const target = canSwapBlock
            ? { from: $from.before(), to: $from.after() }
            : range;
          tr.replaceWith(target.from, target.to, node);
          return undefined;
        },
      }),
    ];
  },
}).configure({
  katexOptions: KATEX_OPTIONS,
  onClick: (node, pos) =>
    emitMathClick({ kind: "block", latex: node.attrs.latex ?? "", pos }),
});
