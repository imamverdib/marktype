/**
 * Round-trip check for the Markdown pipeline.
 *
 * The scariest way an editor can fail is to quietly lose part of a document on
 * save, so this parses Markdown into the editor's schema and serializes it
 * back, then compares. Runs headless: `npm run check:markdown`.
 */
import { MarkdownManager } from "@tiptap/markdown";

import { buildExtensions } from "../src/editor/extensions";
import { INLINE_MATH, INLINE_MATH_TYPED } from "../src/editor/math";
import { tidyMarkdown } from "../src/lib/markdown";
import { WELCOME_DOCUMENT } from "../src/lib/welcome";

const manager = new MarkdownManager({ extensions: buildExtensions() });

/** Mirrors what the app writes to disk, tidying pass included. */
const roundTrip = (markdown: string) => tidyMarkdown(manager.serialize(manager.parse(markdown)));

const CASES: { name: string; input: string; expect?: string }[] = [
  { name: "headings", input: "# One\n\n## Two\n\n###### Six" },
  { name: "emphasis", input: "**bold** and *italic* and ~~struck~~ and `code`" },
  { name: "highlight", input: "==marked==" },
  { name: "blockquote", input: "> quoted line\n>\n> second paragraph" },
  { name: "bullet list", input: "- one\n- two\n  - nested" },
  { name: "ordered list", input: "1. one\n2. two" },
  { name: "task list", input: "- [x] done\n- [ ] pending" },
  { name: "fenced code", input: "```typescript\nconst x: number = 1;\n```" },
  { name: "unlabelled fence", input: "```\nplain\n```" },
  { name: "table", input: "| a | b |\n| --- | --- |\n| 1 | 2 |" },
  { name: "link", input: "[label](https://example.com)" },
  { name: "image", input: "![alt](assets/shot.png)" },
  { name: "inline maths", input: "energy is $E = mc^2$ today" },
  { name: "display maths", input: "$$\n\\int_0^1 x\\,dx\n$$" },
  { name: "horizontal rule", input: "before\n\n---\n\nafter" },
  // Prices are not formulas, and the space between them must survive.
  { name: "currency is not maths", input: "cost is $5 and $10 today" },
  { name: "maths next to prose", input: "when $x > 0$ holds" },
  { name: "angle brackets in prose", input: "keep 3 > 2 readable" },
  { name: "ampersand in prose", input: "Tom & Jerry" },
  { name: "entity written literally", input: "the &amp;gt; entity" },
  { name: "quote marker at line start", input: "&gt; not a quote" },
  { name: "code keeps its entities", input: "```html\n<b>&gt;</b>\n```" },
  { name: "inline code keeps entities", input: "compare `a &gt; b` carefully" },
  { name: "welcome document", input: WELCOME_DOCUMENT },
];

/** Structural comparison: whitespace and table padding are free to change. */
const normalize = (markdown: string) =>
  markdown
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) =>
      line
        .replace(/\s+$/, "")
        .replace(/\|\s+/g, "| ")
        .replace(/\s+\|/g, " |")
        // Table delimiter rows may be padded to any width.
        .replace(/-{3,}/g, "---"),
    )
    .filter((line) => line.length > 0)
    .join("\n")
    .trim();

let failed = 0;

for (const testCase of CASES) {
  const output = roundTrip(testCase.input);
  const expected = testCase.expect ?? testCase.input;
  const ok = normalize(output) === normalize(expected);
  if (!ok) failed += 1;
  console.log(`${ok ? "ok  " : "FAIL"}  ${testCase.name}`);
  if (!ok) {
    console.log("  expected:", JSON.stringify(normalize(expected)));
    console.log("  actual:  ", JSON.stringify(normalize(output)));
  }
}

// Byte-exact checks. The comparison above ignores blank lines, which is exactly
// where "open a file, save it, get a different file" hides.
const EXACT: { name: string; input: string; expect: string }[] = [
  {
    name: "a well-formed file is unchanged byte for byte",
    input: "# Title\n\nBody text.\n",
    expect: "# Title\n\nBody text.\n",
  },
  {
    name: "a missing final newline is added",
    input: "# Title\n\nBody text.",
    expect: "# Title\n\nBody text.\n",
  },
  {
    name: "padding at either end is dropped",
    input: "\n\n# Padded\n\n\n",
    expect: "# Padded\n",
  },
  { name: "an empty document stays empty", input: "", expect: "" },
];

for (const testCase of EXACT) {
  const output = roundTrip(testCase.input);
  const ok = output === testCase.expect;
  if (!ok) failed += 1;
  console.log(`${ok ? "ok  " : "FAIL"}  ${testCase.name}`);
  if (!ok) {
    console.log("  expected:", JSON.stringify(testCase.expect));
    console.log("  actual:  ", JSON.stringify(output));
  }
}

// The typing rule and the parser must agree on what counts as maths, or a
// formula behaves differently depending on whether it was typed or loaded.
const MATH_CASES: { text: string; isMaths: boolean; why: string }[] = [
  { text: "$E = mc^2$", isMaths: true, why: "a plain formula" },
  { text: "$x$", isMaths: true, why: "a single symbol" },
  { text: "$a^2+b^2=c^2$", isMaths: true, why: "no spaces" },
  { text: "$5 and $", isMaths: false, why: "trailing space: two prices, not maths" },
  { text: "$ x $", isMaths: false, why: "padded delimiters" },
  { text: "$100$", isMaths: false, why: "digits only: a price range" },
];

for (const testCase of MATH_CASES) {
  const typed = INLINE_MATH_TYPED.exec(testCase.text);
  const parsed = INLINE_MATH.exec(testCase.text);
  // A digits-only body is rejected by the currency guard in both paths.
  const digitsOnly = /^\$[\d.,\s]+\$$/.test(testCase.text);
  const typedMaths = Boolean(typed) && !digitsOnly;
  const parsedMaths = Boolean(parsed) && !digitsOnly;
  const ok = typedMaths === testCase.isMaths && parsedMaths === testCase.isMaths;
  if (!ok) failed += 1;
  console.log(`${ok ? "ok  " : "FAIL"}  maths: ${testCase.why}`);
  if (!ok) {
    console.log(`  ${JSON.stringify(testCase.text)} typed=${typedMaths} parsed=${parsedMaths} expected=${testCase.isMaths}`);
  }
}

// A second pass must be a fixed point: saving twice may not keep changing text.
const once = roundTrip(WELCOME_DOCUMENT);
const twice = roundTrip(once);
const stable = normalize(once) === normalize(twice);
console.log(`${stable ? "ok  " : "FAIL"}  serialization is stable on re-save`);
if (!stable) failed += 1;

const total = CASES.length + EXACT.length + MATH_CASES.length + 1;
console.log(`\n${total - failed}/${total} checks passed`);
process.exit(failed === 0 ? 0 : 1);
