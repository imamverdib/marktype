import { AlertTriangle, Info } from "lucide-react";

import { cn } from "@/lib/utils";

export type NoticeState = { message: string; tone: "info" | "error" } | null;

/** One transient message at a time, bottom-centre, no queue by design. */
export function Notice({ notice }: { notice: NoticeState }) {
  if (!notice) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-11 z-40 flex justify-center">
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border border-edge bg-panel px-3 py-2",
          "text-[12.5px] text-ink shadow-float",
        )}
      >
        {notice.tone === "error" ? (
          <AlertTriangle className="size-3.5 text-[color:var(--mt-danger)]" />
        ) : (
          <Info className="size-3.5 text-accent" />
        )}
        {notice.message}
      </div>
    </div>
  );
}
