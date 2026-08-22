import { NodeViewContent, NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { Check, ChevronDown, Copy } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { languageLabel } from "./lowlight";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/utils";

/**
 * Code fence chrome: a language picker (writes back to the fence info string)
 * and a copy button. Everything but `NodeViewContent` is `contentEditable=false`
 * so ProseMirror keeps ownership of the code itself.
 */
export function CodeBlockView({ node, updateAttributes, extension, editor }: ReactNodeViewProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const language = (node.attrs.language as string | null) || "plaintext";
  const languages = useMemo(() => {
    const options = extension.options as { lowlight?: { listLanguages(): string[] } };
    return (options.lowlight?.listLanguages() ?? []).slice().sort();
  }, [extension.options]);

  const copy = async () => {
    const ok = await copyText(node.textContent);
    if (!ok) return;
    setCopied(true);
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 1400);
  };

  return (
    <NodeViewWrapper className="mt-codeblock group">
      <div className="mt-codeblock__bar" contentEditable={false}>
        <div className="relative flex items-center">
          <select
            aria-label="Code language"
            className={cn(
              "no-drag cursor-pointer appearance-none rounded-md bg-transparent py-0.5 pr-5 pl-1",
              "text-[11px] font-medium tracking-wide text-ink-muted",
              "hover:text-ink-strong focus:outline-none",
            )}
            value={language}
            disabled={!editor.isEditable}
            onChange={(event) => updateAttributes({ language: event.target.value })}
          >
            {!languages.includes(language) && (
              <option value={language}>{languageLabel(language)}</option>
            )}
            {languages.map((name) => (
              <option key={name} value={name}>
                {languageLabel(name)}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-0.5 size-3 opacity-60" />
        </div>

        <button
          type="button"
          onClick={copy}
          title="Copy code"
          className={cn(
            "no-drag flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px]",
            "text-ink-muted opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100",
            "hover:bg-panel-strong hover:text-ink-strong",
            copied && "opacity-100 text-[color:var(--mt-success)]",
          )}
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <pre spellCheck={false}>
        <NodeViewContent<"code"> as="code" className={`language-${language}`} />
      </pre>
    </NodeViewWrapper>
  );
}
