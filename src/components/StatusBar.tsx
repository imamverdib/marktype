import { AlertTriangle, Check, RefreshCw } from "lucide-react";

import { Switch } from "./ui/Switch";
import { Button } from "./ui/Button";
import { formatReadingTime, type DocumentStats } from "@/lib/stats";
import { cn, formatClock, prettyPath } from "@/lib/utils";

type StatusBarProps = {
  path: string | null;
  home: string | null;
  stats: DocumentStats;
  dirty: boolean;
  saving: boolean;
  lastSavedAt: number | null;
  autosave: boolean;
  staleOnDisk: boolean;
  sourceMode: boolean;
  onToggleAutosave: () => void;
  onReload: () => void;
};

const numberFormat = new Intl.NumberFormat();

/** The quiet bottom strip: where the file lives, how long it is, save state. */
export function StatusBar({
  path,
  home,
  stats,
  dirty,
  saving,
  lastSavedAt,
  autosave,
  staleOnDisk,
  sourceMode,
  onToggleAutosave,
  onReload,
}: StatusBarProps) {
  return (
    <footer
      className={cn(
        "flex h-7 shrink-0 items-center gap-4 border-t border-edge bg-chrome",
        "px-3 text-[11px] text-ink-muted",
      )}
    >
      <span className="min-w-0 flex-1 truncate" title={path ?? undefined}>
        {prettyPath(path, home)}
      </span>

      {staleOnDisk && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onReload}
          className="text-[color:var(--mt-danger)]"
        >
          <AlertTriangle className="size-3" />
          Changed on disk — reload
          <RefreshCw className="size-3" />
        </Button>
      )}

      {sourceMode && (
        <span className="rounded bg-panel-strong px-1.5 py-0.5 font-mono text-[10px]">
          source
        </span>
      )}

      <span className="tabular-nums">{numberFormat.format(stats.words)} words</span>
      <span className="tabular-nums">{numberFormat.format(stats.characters)} chars</span>
      <span className="hidden tabular-nums sm:inline">
        {formatReadingTime(stats.readingMinutes)}
      </span>

      <span className="flex w-24 items-center justify-end gap-1">
        {saving ? (
          "Saving…"
        ) : dirty ? (
          "Unsaved"
        ) : lastSavedAt ? (
          <>
            <Check className="size-3 text-[color:var(--mt-success)]" />
            {formatClock(lastSavedAt)}
          </>
        ) : (
          "Saved"
        )}
      </span>

      <span className="flex items-center gap-1.5">
        <span className="text-ink-faint">Auto</span>
        <Switch checked={autosave} onCheckedChange={onToggleAutosave} label="Auto-save" />
      </span>
    </footer>
  );
}
