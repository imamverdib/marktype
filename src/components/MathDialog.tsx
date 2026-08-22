import type { Editor } from "@tiptap/core";
import katex from "katex";
import { useMemo, useState, useEffect } from "react";

import { Modal } from "./Modal";
import { Button } from "./ui/Button";
import type { MathTarget } from "@/editor/mathBridge";

type MathDialogProps = {
  editor: Editor;
  target: MathTarget | null;
  onClose: () => void;
};

/**
 * LaTeX editor for the maths atoms. They render through KaTeX and hold no
 * editable text of their own, so this dialog is how a formula gets changed.
 */
export function MathDialog({ editor, target, onClose }: MathDialogProps) {
  const [latex, setLatex] = useState("");

  useEffect(() => {
    setLatex(target?.latex ?? "");
  }, [target]);

  const preview = useMemo(() => {
    if (!latex.trim()) return { html: "", error: null as string | null };
    try {
      return {
        html: katex.renderToString(latex, {
          displayMode: target?.kind === "block",
          throwOnError: true,
          strict: false,
        }),
        error: null,
      };
    } catch (error) {
      return { html: "", error: error instanceof Error ? error.message : String(error) };
    }
  }, [latex, target?.kind]);

  if (!target) return null;

  const isNew = target.pos < 0;

  const commit = () => {
    const value = latex.trim();
    const chain = editor.chain().focus();
    if (isNew) {
      if (value) chain.insertBlockMath({ latex: value }).run();
      onClose();
      return;
    }
    if (!value) {
      if (target.kind === "block") chain.deleteBlockMath({ pos: target.pos }).run();
      else chain.deleteInlineMath({ pos: target.pos }).run();
      onClose();
      return;
    }
    if (target.kind === "block") chain.updateBlockMath({ latex: value, pos: target.pos }).run();
    else chain.updateInlineMath({ latex: value, pos: target.pos }).run();
    onClose();
  };

  const remove = () => {
    if (isNew) {
      onClose();
      return;
    }
    const chain = editor.chain().focus();
    if (target.kind === "block") chain.deleteBlockMath({ pos: target.pos }).run();
    else chain.deleteInlineMath({ pos: target.pos }).run();
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={target.kind === "block" ? "Display formula" : "Inline formula"}
      description="LaTeX, rendered with KaTeX. ⌘↩ to apply."
      className="w-[min(34rem,calc(100vw-3rem))]"
      footer={
        <>
          {!isNew && (
            <Button variant="danger" size="sm" onClick={remove}>
              Delete
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="solid" size="sm" onClick={commit}>
            Apply
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2.5">
        <textarea
          className={
            "h-24 w-full resize-none select-text rounded-lg border border-edge bg-canvas px-2.5 py-2 " +
            "font-mono text-[12.5px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
          }
          value={latex}
          spellCheck={false}
          placeholder="\\int_0^\\infty e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}"
          onChange={(event) => setLatex(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              commit();
            }
          }}
        />

        <div className="rounded-lg border border-edge bg-canvas px-3 py-3">
          {preview.error ? (
            <p className="font-mono text-[11px] text-[color:var(--mt-danger)]">
              {preview.error}
            </p>
          ) : preview.html ? (
            <div
              className="mt-surface overflow-x-auto text-center"
              // KaTeX output, generated locally from the text in the box above.
              dangerouslySetInnerHTML={{ __html: preview.html }}
            />
          ) : (
            <p className="text-[11px] text-ink-faint">Preview appears here.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
