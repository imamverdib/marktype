/** Reading pace used for the status-bar estimate. */
const WORDS_PER_MINUTE = 220;

/** Hiragana/katakana, CJK unified ideographs and compatibility ideographs. */
const CJK = /[぀-ヿ㐀-䶿一-鿿豈-﫿]/g;

export type DocumentStats = {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  lines: number;
  readingMinutes: number;
};

/**
 * Counts words the way writing tools do: each CJK ideograph counts as a word,
 * everything else is whitespace-delimited runs.
 */
export function computeStats(text: string): DocumentStats {
  const trimmed = text.trim();
  const cjk = trimmed.match(CJK)?.length ?? 0;
  const latinWords = trimmed
    .replace(CJK, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  const words = latinWords + cjk;

  return {
    words,
    characters: text.length,
    charactersNoSpaces: text.replace(/\s/g, "").length,
    lines: text ? text.split("\n").length : 0,
    readingMinutes: words === 0 ? 0 : Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
  };
}

export function formatReadingTime(minutes: number) {
  if (minutes === 0) return "—";
  if (minutes < 60) return `${minutes} min read`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min read` : `${hours} h read`;
}
