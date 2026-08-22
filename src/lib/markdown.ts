import type { Editor } from "@tiptap/core";

/** Opening (or closing) fence of a code block. */
const FENCE = /^\s{0,3}(`{3,}|~{3,})/;
/** Inline code span: a run of backticks closed by the same run. */
const CODE_SPAN = /(`+)(.+?)\1/g;

/**
 * The Markdown that gets written to disk.
 *
 * TipTap's serializer HTML-encodes `>` and `&` in prose. That is valid Markdown
 * and renders correctly, but a plain-text file full of `&gt;` is not what
 * someone opening it in another editor expects, so the safe subset is decoded
 * back. Code — fenced or inline — is left byte-for-byte, and `<` stays encoded:
 * decoding it could turn text into an HTML block on the next read.
 */
export function documentMarkdown(editor: Editor): string {
  return tidyMarkdown(editor.getMarkdown());
}

export function tidyMarkdown(markdown: string): string {
  let openFence: string | null = null;

  const body = markdown
    .split("\n")
    .map((line) => {
      const trimmed = line.trimStart();

      if (openFence) {
        if (trimmed.startsWith(openFence)) openFence = null;
        return line;
      }

      const fence = FENCE.exec(line);
      if (fence) {
        openFence = fence[1];
        return line;
      }

      return decodeOutsideCode(line);
    })
    .join("\n");

  // Blank lines at either end carry no meaning in Markdown, and a text file is
  // expected to end with exactly one newline — the serializer emits none, which
  // would rewrite every file on the first save.
  const trimmed = body.replace(/^\n+/, "").replace(/\s+$/, "");
  return trimmed ? `${trimmed}\n` : "";
}

/** Applies the entity decode to a line, skipping its inline code spans. */
function decodeOutsideCode(line: string): string {
  let result = "";
  let cursor = 0;

  CODE_SPAN.lastIndex = 0;
  for (let match = CODE_SPAN.exec(line); match; match = CODE_SPAN.exec(line)) {
    result += decodeEntities(line.slice(cursor, match.index), cursor === 0);
    result += match[0];
    cursor = match.index + match[0].length;
  }

  return result + decodeEntities(line.slice(cursor), cursor === 0);
}

function decodeEntities(text: string, atLineStart: boolean): string {
  // A ">" in the left margin would become a blockquote when the file is read
  // back, so the first one on a line keeps its entity.
  const withAngles = text.replace(/&gt;/g, (match, offset: number) =>
    atLineStart && /^\s*$/.test(text.slice(0, offset)) ? match : ">",
  );

  // "&amp;" last, and never where it introduces another entity: text that
  // genuinely reads "&gt;" must not collapse into ">".
  return withAngles.replace(
    /&amp;(?![a-zA-Z][a-zA-Z0-9]*;|#\d+;|#x[0-9a-fA-F]+;)/g,
    "&",
  );
}
