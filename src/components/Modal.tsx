import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { Button } from "./ui/Button";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/**
 * Small dialog shell: dimmed backdrop, Escape to close, focus moved inside.
 * Deliberately lighter than a full Radix dialog — nothing here is nested.
 */
export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  className,
}: ModalProps) {
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    const focusable = card.current?.querySelector<HTMLElement>(
      "input, textarea, select, button",
    );
    focusable?.focus();
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/25 pt-[18vh] backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "w-[min(30rem,calc(100vw-3rem))] overflow-hidden rounded-2xl border border-edge",
          "bg-panel shadow-float",
          className,
        )}
      >
        <header className="flex items-start gap-3 px-4 pt-3.5 pb-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-[13px] font-semibold text-ink-strong">{title}</h2>
            {description && (
              <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">
                {description}
              </p>
            )}
          </div>
          <Button size="icon-sm" onClick={onClose} aria-label="Close">
            <X className="size-3.5" />
          </Button>
        </header>

        <div className="px-4 pb-4">{children}</div>

        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-edge bg-panel-strong px-4 py-2.5">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
