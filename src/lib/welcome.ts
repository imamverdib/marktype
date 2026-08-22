/** First-run document. Doubles as a smoke test of every supported feature. */
export const WELCOME_DOCUMENT = `# Welcome to MarkType

A fast, minimalist Markdown editor for macOS. Everything you type turns into
its formatted self **in place** — there is no split preview to keep in sync.

## Try the syntax

Type \`##\` and a space at the start of a line for a heading, \`**bold**\`,
\`*italic*\`, \`~~strikethrough~~\`, \`==highlight==\` or \`inline code\` anywhere in a
paragraph. The Markdown marker for the block you are editing appears in the
left margin.

> Blockquotes start with an angle bracket.
> They keep their own paragraphs.

- [x] Task lists come from \`- [ ]\` plus a space
- [ ] Click a checkbox to tick it
- [ ] Nest items with Tab

## Code

\`\`\`typescript
export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

## Tables

| Feature      | Shortcut      | Notes                        |
| ------------ | ------------- | ---------------------------- |
| Save         | ⌘S            | ⌘⇧S for Save As              |
| Outline      | ⌘\\\\           | Built from your headings      |
| Source mode  | ⌘/            | The raw Markdown, unfiltered  |

## Maths

Inline maths like $E = mc^2$ sits in the sentence, and a display block stands
on its own:

$$
\\int_{-\\infty}^{\\infty} e^{-x^{2}}\\,dx = \\sqrt{\\pi}
$$

Click any formula to edit its LaTeX.

---

Drag an image onto the window and it is copied next to your document, into an
\`assets/\` folder, so the Markdown stays portable.
`;
