# MarkType

A fast, minimalist Markdown editor, inspired by Typora. What you type becomes
formatted text **in place** — there is no split preview to keep in sync.

It ships as two things from one editor core:

- **`marktype.app`** — a native macOS app built with **Tauri v2** (Rust).
- **`extension/`** — a **live Markdown editor for Antigravity IDE** and any
  VS Code 1.100+ build, packaged as a `.vsix`.

The editor itself is **React + Vite + TypeScript**, **Tailwind CSS v4** and
**TipTap v3** with the official `@tiptap/markdown` round-trip. Everything the
two hosts disagree about — opening a link, storing a pasted image, turning a
local path into a loadable URL — sits behind one small adapter in `src/host/`,
so there is a single copy of the editor.

---

## Feature map

### Live Markdown (WYSIWYG)

| Written as | Becomes |
| --- | --- |
| `# … ######` | headings H1–H6 (the marker shows in the left margin while the caret is inside) |
| `**bold**`, `*italic*`, `~~strike~~`, `==highlight==` | inline marks |
| `` `code` `` | inline code |
| `> ` | blockquote |
| `- `, `1. `, `- [ ] ` | bullet, ordered and task lists (nest with Tab) |
| ` ```lang ` | fenced code block, syntax-highlighted, with a language picker and a copy button |
| `\|  \|  \|` | table, with a floating row/column toolbar |
| `$e^{i\pi}$` / `$$…$$` | inline and display maths, rendered by KaTeX — click a formula to edit its LaTeX |
| `![](path)` | image, from a drop, a paste or Insert ▸ Image |
| `---` | horizontal rule |

### Files and macOS integration

- Native Open / Save / Save As panels (`@tauri-apps/plugin-dialog`) reading and
  writing through `@tauri-apps/plugin-fs`.
- Optional **auto-save**, a dirty indicator in the title bar and a save state in
  the status bar.
- **Outline** sidebar built from H1–H6, tracking the caret.
- Word count, character count and reading time in the status bar.
- Light (Typora GitHub) and dark (Typora Night) themes.
- Full native menu bar, `.md` file association, "Open With" and
  `open -a MarkType note.md` support.
- Dropped images are copied into an `assets/` folder next to the document and
  linked relatively, so the Markdown stays portable.
- Notices when the open file changes on disk, and a confirmation before closing
  or replacing unsaved work.
- **Source mode** (⌘/) to see and edit the exact Markdown that will be saved.
- Typewriter mode, focus mode, font/size/measure preferences.

## Shortcuts

| | |
| --- | --- |
| ⌘N / ⌘O / ⌘S / ⌘⇧S | New, Open, Save, Save As |
| ⌘B / ⌘I / ⌘U / ⌘⇧X | bold, italic, underline, strikethrough |
| ⌘K | link |
| ⌘0 / ⌘1…⌘6 | paragraph, heading 1–6 |
| ⌘⌥T / ⌘⌥C / ⌘⌥M / ⌘⌥I | table, code block, math block, image |
| ⌘\ | toggle outline |
| ⌘/ | source mode |
| ⌘⇧D | toggle dark mode |
| ⌘⌥P / ⌘⌥F / ⌘⌥S | typewriter, focus mode, auto-save |
| ⌘, | preferences |

The in-app sheet under **Help ▸ Keyboard Shortcuts** lists the full set.

## The Antigravity / VS Code extension

```bash
npm install
npm run ext:package      # builds and writes extension/marktype-0.1.0.vsix
```

It is published on Open VSX as
[`imamverdib.marktype`](https://open-vsx.org/extension/imamverdib/marktype), which is
the registry Antigravity uses, so the usual install works:

```bash
"/Applications/Antigravity IDE.app/Contents/Resources/app/bin/antigravity-ide" \
  --install-extension imamverdib.marktype
```

Or search **MarkType** in the Extensions view. To install a local build instead,
point `--install-extension` at `extension/marktype-0.1.0.vsix`; to remove it,
`… --uninstall-extension imamverdib.marktype`.

Publishing a new version needs an Open VSX token in `OVSX_PAT`:

```bash
OVSX_PAT=… npm run ext:publish
```

Then open any Markdown file and click the 📖 button in the editor title bar, or
run **MarkType: Open in Live Markdown Editor**. It is deliberately opt-in, so a
`README.md` still opens as source unless you set
`"workbench.editorAssociations": { "*.md": "marktype.editor" }`.

Inside the IDE the host keeps what it already owns — tabs, saving, dirty state,
undo, Git, themes — and MarkType supplies the document surface:

| Desktop app | In the IDE |
| --- | --- |
| Custom title bar, file dialogs | the IDE's tabs and its own Open/Save |
| Auto-save toggle | `files.autoSave` |
| Status-bar word count | a status bar item |
| Light/dark theme picker | follows the IDE's theme variables |
| Native menu | `MarkType:` commands and keybindings |
| Source mode (⌘/) | **MarkType: Open Markdown Source** |

`extension/README.md` documents the commands, keybindings and settings.

## Requirements

- macOS 10.15+
- Xcode Command Line Tools
- Node.js 20+
- Rust (stable) — `curl https://sh.rustup.rs -sSf | sh`
- Tauri CLI — `cargo install tauri-cli --version "^2" --locked`

## Running

```bash
npm install
cargo tauri dev      # or: npm run tauri:dev
```

`cargo tauri dev` starts Vite on port 1420 and the Rust shell around it.

## Building a release app

```bash
cargo tauri build    # or: npm run tauri:build
```

The `.app` and `.dmg` land in `src-tauri/target/release/bundle/`.

> Release builds are unsigned. To distribute one, set `APPLE_CERTIFICATE` and
> the related notarization variables before running `cargo tauri build`; see the
> Tauri code-signing guide.

## Layout

```
src/                      the shared editor core (used by both hosts)
  App.tsx                 desktop shell: preferences, dialogs, action dispatch
  host/                   the seam between the editor and its host
  editor/
    extensions.ts         the TipTap extension set
    math.ts               $…$ / $$…$$ input rules over @tiptap/extension-mathematics
    MarkdownImage.ts      keeps Markdown paths while showing asset: URLs
    ActiveBlock.ts         marks the block under the caret (margin markers, focus mode)
    CodeBlockView.tsx     code fence chrome: language picker + copy
    lowlight.ts           the highlighter's grammar set
  components/             title bar, outline, status bar, bubbles, dialogs
  hooks/
    useDocumentSession.ts path, dirty state, save, auto-save, close guard
    useFileDrop.ts        native drag & drop (real filesystem paths)
  lib/                    files, assets, stats, outline, settings, menu bridge
src-tauri/                the desktop shell
  src/lib.rs              plugins, commands, "open with" hand-off
  src/menu.rs             the native menu bar
  capabilities/           filesystem and dialog permissions
extension/                the Antigravity / VS Code shell
  src/editorProvider.ts   the custom text editor: sync, images, commands
  src/textSync.ts         minimal-diff document edits
  webview/Shell.tsx       the editor core wired to the IDE
  webview/theme.css       MarkType tokens mapped onto IDE theme variables
  build.mjs               esbuild for the host, Vite for the webview
scripts/
  check-markdown.ts       Markdown round-trip checks (npm run check)
```

## Design notes

- **Markdown is the source of truth.** The dirty flag compares the serialized
  document against what was last read or written, not raw file bytes, so
  normalization on load never shows up as an unsaved change.
- **The Rust side stays thin.** It owns the menu, the Finder hand-off and two
  small helpers; document I/O goes through the fs plugin under a scope limited to
  `$HOME` (with `.ssh`, `.aws`, `.gnupg` and Keychains denied).
- **The native menu owns its accelerators.** macOS consumes them before the
  webview sees the key, so the JavaScript fallbacks in `useShortcuts` cover only
  the file and view commands — never the formatting keys the editor binds itself.
- **In the IDE, the document owns its keys.** While a MarkType tab is focused,
  the keys the editor handles are claimed by a no-op command so the IDE's own
  bindings for them (⌘B for the side bar, ⌘K's chord) stay out of the way.
- **Round-trip fidelity is tested, not assumed.** `npm run check` parses and
  re-serializes every supported construct, including byte-exact cases, because
  the way an editor loses data is by quietly rewriting a file on save.

## Licence

MIT — © 2026 Behbudlu. See [`LICENSE`](LICENSE).
