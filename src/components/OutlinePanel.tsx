import { ListTree } from "lucide-react";

import { cn } from "@/lib/utils";
import type { OutlineItem } from "@/lib/outline";

type OutlinePanelProps = {
  items: OutlineItem[];
  activeIndex: number;
  onSelect: (item: OutlineItem) => void;
};

const INDENT = ["pl-3", "pl-3", "pl-6", "pl-9", "pl-12", "pl-14", "pl-16"];

/** Document map built from H1–H6, mirroring Typora's outline pane. */
export function OutlinePanel({ items, activeIndex, onSelect }: OutlinePanelProps) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-edge bg-panel">
      <div className="flex h-9 items-center gap-2 px-3 text-[10px] font-semibold tracking-wider text-ink-faint uppercase">
        <ListTree className="size-3.5" />
        Outline
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto pb-3">
        {items.length === 0 ? (
          <p className="px-3 py-2 text-[11px] leading-relaxed text-ink-faint">
            Headings you write with <code className="font-mono">#</code> show up here.
          </p>
        ) : (
          <ul>
            {items.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  title={item.text}
                  className={cn(
                    "no-drag block w-full truncate py-[3px] pr-2 text-left text-[12px]",
                    "transition-colors duration-100",
                    INDENT[item.level] ?? "pl-3",
                    item.level === 1 ? "font-medium" : "font-normal",
                    index === activeIndex
                      ? "bg-accent-soft text-accent"
                      : "text-ink-muted hover:bg-panel-strong hover:text-ink-strong",
                  )}
                >
                  {item.text}
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </aside>
  );
}
