import { clamp } from "./utils";

export type ThemeName = "light" | "dark";
export type FontChoice = "sans" | "serif" | "mono";

export type Preferences = {
  theme: ThemeName;
  fontFamily: FontChoice;
  fontSize: number;
  measure: number;
  autosave: boolean;
  typewriter: boolean;
  focusMode: boolean;
  spellcheck: boolean;
};

export const DEFAULT_PREFERENCES: Preferences = {
  theme: window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  fontFamily: "sans",
  fontSize: 16,
  measure: 46,
  autosave: false,
  typewriter: false,
  focusMode: false,
  spellcheck: true,
};

const STORAGE_KEY = "marktype.preferences.v1";

export function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return sanitize({ ...DEFAULT_PREFERENCES, ...parsed });
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(preferences: Preferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // A private/blocked store just means preferences live for this session.
  }
}

function sanitize(preferences: Preferences): Preferences {
  return {
    ...preferences,
    theme: preferences.theme === "dark" ? "dark" : "light",
    fontFamily: (["sans", "serif", "mono"] as const).includes(preferences.fontFamily)
      ? preferences.fontFamily
      : "sans",
    fontSize: clamp(Number(preferences.fontSize) || 16, 12, 26),
    measure: clamp(Number(preferences.measure) || 46, 32, 76),
  };
}

const FONT_VARIABLE: Record<FontChoice, string> = {
  sans: "var(--mt-font-body)",
  serif: "var(--mt-font-serif)",
  mono: "var(--mt-font-mono)",
};

/** Pushes preferences onto the document root, where the CSS reads them. */
export function applyPreferences(preferences: Preferences) {
  const root = document.documentElement;
  root.classList.toggle("dark", preferences.theme === "dark");
  root.style.setProperty("--mt-font-family", FONT_VARIABLE[preferences.fontFamily]);
  root.style.setProperty("--mt-font-size", `${preferences.fontSize}px`);
  root.style.setProperty("--mt-measure", `${preferences.measure}rem`);
}

/** Recent-documents list, kept small and de-duplicated. */
const RECENT_KEY = "marktype.recent.v1";
const RECENT_LIMIT = 8;

export function loadRecent(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

export function pushRecent(path: string): string[] {
  const next = [path, ...loadRecent().filter((entry) => entry !== path)].slice(0, RECENT_LIMIT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Non-fatal.
  }
  return next;
}
