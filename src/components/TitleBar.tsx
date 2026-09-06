import {
  Circle,
  Code2,
  FileDown,
  FilePlus2,
  FolderOpen,
  Keyboard,
  MoreHorizontal,
  Moon,
  Save,
  Settings2,
  Sun,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "./ui/DropdownMenu";
import { Button } from "./ui/Button";
import { Tooltip } from "./ui/Tooltip";
import { baseName, cn, formatShortcut } from "@/lib/utils";
import type { Preferences } from "@/lib/settings";

type TitleBarProps = {
  /** `desktop` leaves room for the traffic lights and offers Finder actions. */
  variant?: "desktop" | "web";
  name: string;
  dirty: boolean;
  saving: boolean;
  recent: string[];
  preferences: Preferences;
  onAction: (action: TitleBarAction) => void;
  onOpenRecent: (path: string) => void;
};

export type TitleBarAction =
  | "new"
  | "open"
  | "save"
  | "save-as"
  | "reveal"
  | "copy-markdown"
  | "toggle-theme"
  | "toggle-source"
  | "toggle-typewriter"
  | "toggle-focus-mode"
  | "toggle-autosave"
  | "preferences"
  | "shortcuts";

/**
 * Custom window chrome. The whole bar is a drag region except the controls,
 * and the left inset leaves room for the traffic lights.
 */
export function TitleBar({
  variant = "desktop",
  name,
  dirty,
  saving,
  recent,
  preferences,
  onAction,
  onOpenRecent,
}: TitleBarProps) {
  const dark = preferences.theme === "dark";
  const desktop = variant === "desktop";

  return (
    <header
      data-tauri-drag-region
      className={cn(
        "drag-region relative flex h-11 shrink-0 items-center gap-1 border-b border-edge",
        "bg-chrome pr-2",
        desktop ? "pl-[84px]" : "pl-2",
      )}
    >
      <div
        data-tauri-drag-region
        className="drag-region flex min-w-0 flex-1 items-center justify-center gap-1.5"
      >
        <span className="truncate text-[13px] font-medium text-ink-strong">{name}</span>
        {dirty && (
          <Circle
            className="size-2 shrink-0 fill-current text-ink-faint"
            aria-label="Unsaved changes"
          />
        )}
        {saving && <span className="text-[11px] text-ink-faint">saving…</span>}
      </div>

      <Tooltip label="Source code mode" shortcut={formatShortcut("Mod+/")}>
        <Button
          size="icon"
          onClick={() => onAction("toggle-source")}
          aria-label="Source code mode"
        >
          <Code2 className="size-4" />
        </Button>
      </Tooltip>

      <Tooltip label={dark ? "Light theme" : "Dark theme"} shortcut={formatShortcut("Mod+Shift+D")}>
        <Button size="icon" onClick={() => onAction("toggle-theme")} aria-label="Toggle theme">
          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" aria-label="More actions">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => onAction("new")}>
            <FilePlus2 className="size-3.5" /> New
            <DropdownMenuShortcut>{formatShortcut("Mod+N")}</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAction("open")}>
            <FolderOpen className="size-3.5" /> Open…
            <DropdownMenuShortcut>{formatShortcut("Mod+O")}</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAction("save")}>
            <Save className="size-3.5" /> Save
            <DropdownMenuShortcut>{formatShortcut("Mod+S")}</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAction("save-as")}>
            <FileDown className="size-3.5" /> Save As…
            <DropdownMenuShortcut>{formatShortcut("Mod+Shift+S")}</DropdownMenuShortcut>
          </DropdownMenuItem>

          {recent.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Recent</DropdownMenuLabel>
              {recent.slice(0, 6).map((entry) => (
                <DropdownMenuItem
                  key={entry}
                  inset
                  onSelect={() => onOpenRecent(entry)}
                  title={entry}
                >
                  <span className="truncate">{baseName(entry)}</span>
                </DropdownMenuItem>
              ))}
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={preferences.autosave}
            onCheckedChange={() => onAction("toggle-autosave")}
          >
            Auto-save
            <DropdownMenuShortcut>{formatShortcut("Mod+Alt+S")}</DropdownMenuShortcut>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={preferences.typewriter}
            onCheckedChange={() => onAction("toggle-typewriter")}
          >
            Typewriter mode
            <DropdownMenuShortcut>{formatShortcut("Mod+Alt+P")}</DropdownMenuShortcut>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={preferences.focusMode}
            onCheckedChange={() => onAction("toggle-focus-mode")}
          >
            Focus mode
            <DropdownMenuShortcut>{formatShortcut("Mod+Alt+F")}</DropdownMenuShortcut>
          </DropdownMenuCheckboxItem>

          <DropdownMenuSeparator />
          {desktop && (
            <DropdownMenuItem onSelect={() => onAction("reveal")}>
              <FolderOpen className="size-3.5" /> Reveal in Finder
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => onAction("preferences")}>
            <Settings2 className="size-3.5" /> Preferences…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAction("shortcuts")}>
            <Keyboard className="size-3.5" /> Keyboard shortcuts
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
