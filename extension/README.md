# MarkType — Live Markdown Editor

Typora-style Markdown editing inside Antigravity IDE (and any VS Code 1.100+
build). What you type turns into its formatted self **in place** — no split
preview to keep in sync, no second pane.

The editor is the same engine as the MarkType desktop app; this package wraps it
as a custom editor so the IDE keeps owning tabs, saving, undo and themes.

Install it from the Extensions view (search **MarkType**), or:

```bash
antigravity-ide --install-extension imamverdib.marktype
```

## Opening a document

The live editor is **opt-in**, so a `README.md` still opens as source by default.
To use it:

- click the 📖 button in the editor title bar of any Markdown file, or
- run **MarkType: Open in Live Markdown Editor** from the Command Palette, or
- right-click a `.md` file in the Explorer.

**MarkType: Open Markdown Source** takes you back to the raw text.

Prefer it always? Add this to your settings:

```json
"workbench.editorAssociations": {
  "*.md": "marktype.editor"
}
```

## What it does

| Written as | Becomes |
| --- | --- |
| `# … ######` | headings H1–H6; the marker shows in the margin while the caret is inside |
| `**bold**`, `*italic*`, `~~strike~~`, `==highlight==` | inline marks |
| `` `code` `` | inline code |
| `> ` | blockquote |
| `- `, `1. `, `- [ ] ` | bullet, ordered and task lists (Tab to nest) |
| ` ```lang ` | code fence with syntax highlighting, a language picker and a copy button |
| `\|  \|  \|` | table, with a floating row/column toolbar |
| `$x^2$` / `$$…$$` | inline and display maths via KaTeX — click a formula to edit its LaTeX |
| an image you drop, paste or pick | an `![…]` link into `assets/` beside the document |
| `---` | horizontal rule |

Alongside that: a heading outline beside the document, a word count in the IDE
status bar, ⌘F find inside the editor, typewriter and focus modes, and full
round-trip fidelity — the file you save is the Markdown you would have written
by hand.

## Keyboard

The document has focus, so the editor handles formatting keys directly:

| | |
| --- | --- |
| ⌘B / ⌘I / ⌘U | bold, italic, underline |
| ⌘⇧S / ⌘⇧H / ⌘E | strikethrough, highlight, inline code |
| ⌘K | link |
| ⌘⌥1…⌘⌥6 | heading 1–6 |
| ⌘⇧7 / ⌘⇧8 / ⌘⇧9 | ordered, bullet, task list |
| ⌘⇧B / ⌘⌥C | blockquote, code block |
| ⌘⌥M / ⌘⌥I | math block, image |
| ⌘⇧O | toggle outline |
| ⌘S / ⌘Z | save and undo, handled the usual way |

While a MarkType tab is focused, those keys are claimed for the document, so the
IDE's own bindings for them (⌘B for the side bar, ⌘K's chord) stay out of the
way. Every action is also a `MarkType:` command in the palette, so you can
rebind any of them.

## Settings

| Setting | Default | |
| --- | --- | --- |
| `marktype.fontFamily` | `sans` | `sans`, `serif`, `mono` or `editor` |
| `marktype.fontSize` | `0` | pixels; `0` follows `editor.fontSize` + 2 |
| `marktype.lineWidth` | `46` | text column width, in rem |
| `marktype.showOutline` | `true` | heading outline beside the document |
| `marktype.typewriterMode` | `false` | hold the caret at a fixed height |
| `marktype.focusMode` | `false` | dim every block but the current one |
| `marktype.spellcheck` | `true` | system spell checker on document text |
| `marktype.imageFolder` | `assets` | where pasted and dropped images go |

## How it fits together

- A `CustomTextEditorProvider` owns the tab; the document stays a normal
  `TextDocument`, so saving, dirty state, Git and Timeline all behave normally.
- Each burst of typing becomes **one minimal edit** — the common prefix and
  suffix are trimmed, so the undo stack and other editors' cursors are left
  alone rather than being hit with a whole-file replace per keystroke.
- ⌘S pulls the last keystrokes out of the webview before writing, so nothing
  typed in the final moments is lost.
- Edits made elsewhere (another editor, a Git checkout) are pushed back into the
  editor with the caret kept roughly in place.
- The colour scheme is read from the IDE's own theme variables, so it follows
  whatever theme you use, including high contrast.

## Licence

MIT — © 2026 Behbudlu. See `LICENSE`.

Source: [github.com/imamverdib/marktype](https://github.com/imamverdib/marktype)
