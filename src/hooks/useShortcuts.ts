import { useEffect } from "react";

import type { MenuAction } from "@/lib/menu";

/**
 * Fallback bindings for the file and view commands.
 *
 * On macOS the native menu's accelerators are consumed before the webview sees
 * the key, so these only fire if the menu is unavailable. Formatting keys are
 * deliberately absent: the editor binds those itself, and handling them twice
 * would cancel out.
 */
const BINDINGS: { key: string; shift?: boolean; alt?: boolean; action: MenuAction }[] = [
  { key: "n", action: "new" },
  { key: "o", action: "open" },
  { key: "s", action: "save" },
  { key: "s", shift: true, action: "save-as" },
  { key: "r", alt: true, action: "reveal" },
  { key: "d", shift: true, action: "toggle-theme" },
  { key: "/", action: "toggle-source" },
  { key: ",", action: "preferences" },
  { key: "p", alt: true, action: "toggle-typewriter" },
  { key: "f", alt: true, action: "toggle-focus-mode" },
  { key: "s", alt: true, action: "toggle-autosave" },
];

export function useShortcuts(onAction: (action: MenuAction) => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;

      const key = event.key.toLowerCase();
      const match = BINDINGS.find(
        (binding) =>
          binding.key === key &&
          Boolean(binding.shift) === event.shiftKey &&
          Boolean(binding.alt) === event.altKey,
      );
      if (!match) return;

      event.preventDefault();
      onAction(match.action);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onAction]);
}
