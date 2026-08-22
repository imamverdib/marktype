import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type SourceEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

/**
 * Raw Markdown mode (⌘/). Plain textarea on purpose: the point is to see and
 * fix exactly the characters that will be written to disk.
 */
export function SourceEditor({ value, onChange }: SourceEditorProps) {
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    area.current?.focus();
  }, []);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div
        className="mx-auto w-full px-8 pt-10 pb-[40vh]"
        style={{ maxWidth: "var(--mt-measure)" }}
      >
        <textarea
          ref={area}
          value={value}
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            // Keep Tab inside the document instead of moving focus.
            if (event.key !== "Tab") return;
            event.preventDefault();
            const element = event.currentTarget;
            const { selectionStart, selectionEnd } = element;
            const next = `${value.slice(0, selectionStart)}  ${value.slice(selectionEnd)}`;
            onChange(next);
            requestAnimationFrame(() => {
              element.selectionStart = element.selectionEnd = selectionStart + 2;
            });
          }}
          className={cn(
            "mt-source min-h-[60vh] w-full resize-none select-text border-none bg-transparent",
            "text-ink outline-none placeholder:text-ink-faint",
          )}
          placeholder="# Markdown source"
        />
      </div>
    </div>
  );
}
