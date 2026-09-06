import { listen, type UnlistenFn } from "@tauri-apps/api/event";

/** Ids emitted by the native menu (see `src-tauri/src/menu.rs`). */
export const MENU_ACTIONS = [
  "preferences",
  "new",
  "open",
  "save",
  "save-as",
  "reveal",
  "copy-markdown",
  "bold",
  "italic",
  "underline",
  "strike",
  "highlight",
  "code",
  "link",
  "paragraph",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "clear-format",
  "bullet-list",
  "ordered-list",
  "task-list",
  "blockquote",
  "code-block",
  "table",
  "math-block",
  "image",
  "horizontal-rule",
  "toggle-theme",
  "toggle-typewriter",
  "toggle-focus-mode",
  "toggle-autosave",
  "toggle-source",
  "devtools",
  "shortcuts",
] as const;

export type MenuAction = (typeof MENU_ACTIONS)[number];

const isMenuAction = (value: unknown): value is MenuAction =>
  typeof value === "string" && (MENU_ACTIONS as readonly string[]).includes(value);

/**
 * Subscribes to native menu selections. Also the single place that knows the
 * event name, so the keyboard fallback in `useShortcuts` can reuse the ids.
 */
export function onMenuAction(handler: (action: MenuAction) => void): Promise<UnlistenFn> {
  return listen<string>("menu:action", (event) => {
    if (isMenuAction(event.payload)) handler(event.payload);
  });
}
