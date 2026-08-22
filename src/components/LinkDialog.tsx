import type { Editor } from "@tiptap/core";
import { useEffect, useState } from "react";

import { Modal } from "./Modal";
import { Button } from "./ui/Button";

type LinkDialogProps = {
  editor: Editor;
  open: boolean;
  onClose: () => void;
};

const inputClass =
  "w-full select-text rounded-lg border border-edge bg-canvas px-2.5 py-1.5 text-[13px] " +
  "text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none";

/** Add, edit or remove a link on the current selection (⌘K). */
export function LinkDialog({ editor, open, onClose }: LinkDialogProps) {
  const [href, setHref] = useState("");
  const [text, setText] = useState("");
  const [hadLink, setHadLink] = useState(false);

  useEffect(() => {
    if (!open) return;
    const { from, to } = editor.state.selection;
    const attributes = editor.getAttributes("link") as { href?: string };
    setHref(attributes.href ?? "");
    setHadLink(Boolean(attributes.href));
    setText(editor.state.doc.textBetween(from, to, " "));
  }, [open, editor]);

  const commit = () => {
    const url = href.trim();
    if (!url) return;

    const { from, to } = editor.state.selection;
    const chain = editor.chain().focus();

    if (from === to) {
      // No selection: insert the link text itself.
      chain
        .insertContent({
          type: "text",
          text: text.trim() || url,
          marks: [{ type: "link", attrs: { href: url } }],
        })
        .run();
    } else if (text.trim() && text.trim() !== editor.state.doc.textBetween(from, to, " ")) {
      chain
        .insertContent({
          type: "text",
          text: text.trim(),
          marks: [{ type: "link", attrs: { href: url } }],
        })
        .run();
    } else {
      chain.extendMarkRange("link").setLink({ href: url }).run();
    }
    onClose();
  };

  const remove = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={hadLink ? "Edit link" : "Insert link"}
      description="Web addresses and relative paths to other Markdown files both work."
      footer={
        <>
          {hadLink && (
            <Button variant="danger" size="sm" onClick={remove}>
              Remove
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="solid" size="sm" onClick={commit} disabled={!href.trim()}>
            {hadLink ? "Update" : "Insert"}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-2.5"
        onSubmit={(event) => {
          event.preventDefault();
          commit();
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-ink-muted">URL</span>
          <input
            className={inputClass}
            value={href}
            onChange={(event) => setHref(event.target.value)}
            placeholder="https://example.com"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-ink-muted">Text</span>
          <input
            className={inputClass}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Link text"
          />
        </label>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
