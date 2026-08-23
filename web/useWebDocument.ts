import type { Editor } from "@tiptap/core";
import { useCallback, useEffect, useRef, useState } from "react";

import { documentMarkdown } from "@/lib/markdown";

/** Chromium exposes the File System Access API; Safari and Firefox do not. */
type SaveHandle = {
  name: string;
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
  getFile(): Promise<File>;
};

type PickerWindow = Window & {
  showOpenFilePicker?: (options?: unknown) => Promise<SaveHandle[]>;
  showSaveFilePicker?: (options?: unknown) => Promise<SaveHandle>;
};

const picker = window as PickerWindow;
export const canSaveInPlace = typeof picker.showSaveFilePicker === "function";

const MARKDOWN_PICKER = {
  types: [
    {
      description: "Markdown",
      accept: { "text/markdown": [".md", ".markdown", ".mdown", ".mkd", ".mdx"] },
    },
  ],
};

const DRAFT_KEY = "marktype.web.draft.v1";
const DIRTY_CHECK_DELAY = 220;
const AUTOSAVE_DELAY = 1200;

type Draft = { name: string; text: string };

export function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    if (typeof parsed.text !== "string") return null;
    return { name: parsed.name || "Untitled.md", text: parsed.text };
  } catch {
    return null;
  }
}

type Options = {
  editor: Editor;
  getContent: () => string;
  onBeforeLoad?: () => void;
  autosave: boolean;
  notify: (message: string, tone?: "info" | "error") => void;
};

/**
 * The browser's answer to `useDocumentSession`.
 *
 * There is no path to save back to unless the visitor granted one through the
 * file picker, so the fallback is a download — and a copy of the document is
 * kept in localStorage so a refresh never loses work.
 */
export function useWebDocument({
  editor,
  getContent,
  onBeforeLoad,
  autosave,
  notify,
}: Options) {
  const [name, setName] = useState("Untitled.md");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [revision, setRevision] = useState(0);

  const handle = useRef<SaveHandle | null>(null);
  const baseline = useRef("");
  const getContentRef = useRef(getContent);
  const beforeLoadRef = useRef(onBeforeLoad);
  getContentRef.current = getContent;
  beforeLoadRef.current = onBeforeLoad;

  const applyLoaded = useCallback(
    (text: string, fileName: string) => {
      beforeLoadRef.current?.();
      editor.commands.setContent(text, { contentType: "markdown", emitUpdate: false });
      baseline.current = documentMarkdown(editor);
      setName(fileName);
      setDirty(false);
      setLastSavedAt(null);
      editor.commands.focus("start");
    },
    [editor],
  );

  const guardUnsaved = useCallback(
    () => !dirty || window.confirm(`“${name}” has unsaved changes. Discard them?`),
    [dirty, name],
  );

  const newDocument = useCallback(() => {
    if (!guardUnsaved()) return;
    handle.current = null;
    applyLoaded("", "Untitled.md");
  }, [applyLoaded, guardUnsaved]);

  const openDialog = useCallback(async () => {
    if (!guardUnsaved()) return;
    try {
      if (picker.showOpenFilePicker) {
        const [chosen] = await picker.showOpenFilePicker(MARKDOWN_PICKER);
        if (!chosen) return;
        handle.current = chosen;
        const file = await chosen.getFile();
        applyLoaded(await file.text(), file.name);
        return;
      }
      // No File System Access API: read-only import through an <input>.
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".md,.markdown,.mdown,.mkd,.mdx,.txt,text/markdown";
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (file) {
          handle.current = null;
          applyLoaded(await file.text(), file.name);
        }
        input.remove();
      });
      document.body.append(input);
      input.click();
    } catch (error) {
      // An aborted picker is a normal outcome, not a failure.
      if ((error as { name?: string }).name !== "AbortError") {
        notify("Could not open that file", "error");
      }
    }
  }, [applyLoaded, guardUnsaved, notify]);

  const download = useCallback((text: string, fileName: string) => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }, []);

  const writeTo = useCallback(
    async (target: SaveHandle | null, fileName: string) => {
      const content = getContentRef.current();
      setSaving(true);
      try {
        if (target) {
          const writable = await target.createWritable();
          await writable.write(content);
          await writable.close();
        } else {
          download(content, fileName);
        }
        baseline.current = content;
        setDirty(false);
        setName(fileName);
        setLastSavedAt(Date.now());
        return true;
      } catch (error) {
        if ((error as { name?: string }).name !== "AbortError") {
          notify("Could not save the document", "error");
        }
        return false;
      } finally {
        setSaving(false);
      }
    },
    [download, notify],
  );

  const saveAs = useCallback(async () => {
    if (picker.showSaveFilePicker) {
      try {
        const chosen = await picker.showSaveFilePicker({
          suggestedName: name,
          ...MARKDOWN_PICKER,
        });
        handle.current = chosen;
        return writeTo(chosen, chosen.name);
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") return false;
      }
    }
    return writeTo(null, name);
  }, [name, writeTo]);

  const save = useCallback(async () => {
    if (handle.current) return writeTo(handle.current, handle.current.name);
    return saveAs();
  }, [saveAs, writeTo]);

  const touch = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (revision === 0) return;
    const timer = setTimeout(() => {
      const text = getContentRef.current();
      setDirty(text !== baseline.current);
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ name, text }));
      } catch {
        // A full or blocked store just means no crash recovery this session.
      }
    }, DIRTY_CHECK_DELAY);
    return () => clearTimeout(timer);
  }, [revision, name]);

  // Auto-save only makes sense once there is somewhere to write back to.
  useEffect(() => {
    if (!autosave || !dirty || !handle.current || saving) return;
    const timer = setTimeout(() => {
      void save();
    }, AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
  }, [autosave, dirty, revision, saving, save]);

  useEffect(() => {
    document.title = `${dirty ? "• " : ""}${name} — MarkType`;
  }, [dirty, name]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /** Called once on mount to seed the editor. */
  const restore = useCallback(
    (text: string, fileName: string) => {
      applyLoaded(text, fileName);
    },
    [applyLoaded],
  );

  return {
    name,
    dirty,
    saving,
    lastSavedAt,
    canSaveInPlace,
    newDocument,
    openDialog,
    save,
    saveAs,
    touch,
    restore,
  };
}
