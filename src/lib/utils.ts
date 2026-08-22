import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware class joiner (the shadcn/ui `cn` helper). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Trailing-edge debounce with a `cancel` escape hatch. */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, wait: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const debounced = (...args: A) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
  };
  return debounced;
}

/** Last path segment, with a fallback for the unsaved document. */
export function baseName(path: string | null, fallback = "Untitled.md") {
  if (!path) return fallback;
  const segment = path.split("/").filter(Boolean).pop();
  return segment || fallback;
}

export function directoryName(path: string) {
  const index = path.lastIndexOf("/");
  return index <= 0 ? "/" : path.slice(0, index);
}

/** `~/Documents/notes` — shortened for the status bar. */
export function prettyPath(path: string | null, home?: string | null) {
  if (!path) return "Not saved yet";
  if (home && path.startsWith(home)) return `~${path.slice(home.length)}`;
  return path;
}

export function formatClock(timestamp: number | null) {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const isMac = () =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** Renders "⌘⇧S"-style hints from a portable descriptor such as "Mod+Shift+S". */
export function formatShortcut(descriptor: string) {
  const mac = isMac();
  return descriptor
    .split("+")
    .map((key) => {
      switch (key.toLowerCase()) {
        case "mod":
          return mac ? "⌘" : "Ctrl";
        case "shift":
          return mac ? "⇧" : "Shift";
        case "alt":
        case "option":
          return mac ? "⌥" : "Alt";
        case "ctrl":
          return mac ? "⌃" : "Ctrl";
        case "enter":
          return "↩";
        case "backspace":
          return "⌫";
        case "escape":
          return "esc";
        default:
          return key.length === 1 ? key.toUpperCase() : key;
      }
    })
    .join(mac ? "" : "+");
}
