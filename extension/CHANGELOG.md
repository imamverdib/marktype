# Changelog

## 0.1.2

- Declare the source repository, so the listing links back to the code.

## 0.1.1

Fixes found by driving the editor in a real browser.

- Typing `$5 and $10` no longer swallows the space between the two prices. The
  input rule was looser than the Markdown parser, so a price pair became a
  formula while typing but not when the file was read back.
- `- [ ] ` now produces a task list while typing, matching how the same text is
  read from a file. Upstream only converts a bare `[ ] ` in a paragraph.
- Enter on an empty list item leaves the list instead of adding another empty
  one.
- Opening a document no longer marks the tab dirty, and the file's final newline
  is preserved, so open-then-save leaves a well-formed file byte-identical.

## 0.1.0

First release.

- Live, in-place Markdown editing as a custom editor for `.md`, `.markdown`,
  `.mdown`, `.mkd` and `.mdx` files.
- Headings, emphasis, strikethrough, highlight, inline code, blockquotes,
  bullet/ordered/task lists, horizontal rules.
- Code fences with syntax highlighting, a language picker and a copy button.
- Tables with a floating row and column toolbar.
- KaTeX maths: `$inline$` and `$$display$$`, with a LaTeX editor on click.
- Images by drop, paste or picker, copied into a configurable folder beside the
  document and linked relatively.
- Heading outline, word count in the status bar, typewriter and focus modes.
- Minimal-diff document edits, ⌘S flushing, and external-change sync.
