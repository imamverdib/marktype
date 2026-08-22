import type { Editor } from "@tiptap/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { setDocumentDir } from "@/lib/tauriAssets";
import {
  confirmDiscard,
  fileMeta,
  pickAndReadDocument,
  pickSavePath,
  readDocument,
  reportError,
  writeDocument,
} from "@/lib/files";
import { documentMarkdown } from "@/lib/markdown";
import { loadRecent, pushRecent } from "@/lib/settings";
import { baseName } from "@/lib/utils";

const AUTOSAVE_DELAY = 1200;
const DIRTY_CHECK_DELAY = 220;

export type DocumentSession = ReturnType<typeof useDocumentSession>;

type Options = {
  editor: Editor | null;
  /** Markdown as it would be written right now (source mode aware). */
  getContent: () => string;
  /** Called before content is replaced, so the app can leave source mode. */
  onBeforeLoad?: () => void;
  autosave: boolean;
  notify: (message: string, tone?: "info" | "error") => void;
};

/**
 * Owns everything about "the file on disk": path, dirty state, saving,
 * auto-save, the close guard and the on-disk-changed check.
 */
export function useDocumentSession({
  editor,
  getContent,
  onBeforeLoad,
  autosave,
  notify,
}: Options) {
  const [path, setPath] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [recent, setRecent] = useState<string[]>(() => loadRecent());
  const [revision, setRevision] = useState(0);
  const [staleOnDisk, setStaleOnDisk] = useState(false);

  /** Serialized content as of the last load or save. */
  const baseline = useRef("");
  const pathRef = useRef<string | null>(null);
  const diskMtime = useRef<number | null>(null);
  const forceClose = useRef(false);
  const getContentRef = useRef(getContent);
  const beforeLoadRef = useRef(onBeforeLoad);

  getContentRef.current = getContent;
  beforeLoadRef.current = onBeforeLoad;
  pathRef.current = path;

  const name = useMemo(() => baseName(path), [path]);

  const rememberDiskState = useCallback(async (target: string | null) => {
    if (!target) {
      diskMtime.current = null;
      return;
    }
    try {
      diskMtime.current = (await fileMeta(target)).modifiedMs;
    } catch {
      diskMtime.current = null;
    }
    setStaleOnDisk(false);
  }, []);

  /** Replaces the document and resets the dirty baseline. */
  const applyLoadedContent = useCallback(
    (markdown: string, nextPath: string | null) => {
      if (!editor) return;
      beforeLoadRef.current?.();
      setDocumentDir(nextPath);
      editor.commands.setContent(markdown, {
        contentType: "markdown",
        emitUpdate: false,
      });
      baseline.current = documentMarkdown(editor);
      setPath(nextPath);
      setDirty(false);
      setLastSavedAt(null);
      editor.commands.focus("start");
      void rememberDiskState(nextPath);
    },
    [editor, rememberDiskState],
  );

  const guardUnsaved = useCallback(async () => {
    if (!dirty) return true;
    return confirmDiscard(baseName(pathRef.current));
  }, [dirty]);

  const newDocument = useCallback(async () => {
    if (!(await guardUnsaved())) return;
    applyLoadedContent("", null);
  }, [applyLoadedContent, guardUnsaved]);

  const openPath = useCallback(
    async (target: string) => {
      if (!(await guardUnsaved())) return;
      try {
        const document = await readDocument(target);
        applyLoadedContent(document.content, document.path);
        setRecent(pushRecent(document.path));
      } catch (error) {
        await reportError("Could not open file", error);
      }
    },
    [applyLoadedContent, guardUnsaved],
  );

  const openDialog = useCallback(async () => {
    if (!(await guardUnsaved())) return;
    try {
      const document = await pickAndReadDocument();
      if (!document) return;
      applyLoadedContent(document.content, document.path);
      setRecent(pushRecent(document.path));
    } catch (error) {
      await reportError("Could not open file", error);
    }
  }, [applyLoadedContent, guardUnsaved]);

  const writeTo = useCallback(
    async (target: string) => {
      const content = getContentRef.current();
      setSaving(true);
      try {
        await writeDocument(target, content);
        baseline.current = content;
        setPath(target);
        setDocumentDir(target);
        setDirty(false);
        setLastSavedAt(Date.now());
        setRecent(pushRecent(target));
        await rememberDiskState(target);
        return true;
      } catch (error) {
        await reportError("Could not save file", error);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [rememberDiskState],
  );

  const saveAs = useCallback(async () => {
    const target = await pickSavePath(baseName(pathRef.current));
    if (!target) return false;
    return writeTo(target);
  }, [writeTo]);

  const save = useCallback(async () => {
    const target = pathRef.current;
    if (!target) return saveAs();
    return writeTo(target);
  }, [saveAs, writeTo]);

  /** Called on every editor/source change; recomputes dirty on a trailing edge. */
  const touch = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (revision === 0) return;
    const timer = setTimeout(() => {
      setDirty(getContentRef.current() !== baseline.current);
    }, DIRTY_CHECK_DELAY);
    return () => clearTimeout(timer);
  }, [revision]);

  // Auto-save: only for documents that already live somewhere on disk.
  useEffect(() => {
    if (!autosave || !dirty || !pathRef.current || saving) return;
    const timer = setTimeout(() => {
      void save();
    }, AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
  }, [autosave, dirty, revision, saving, save]);

  // Keep the window title in sync — it shows up in Window ▸ and Mission Control.
  useEffect(() => {
    void getCurrentWindow()
      .setTitle(`${dirty ? "• " : ""}${name}`)
      .catch(() => undefined);
  }, [dirty, name]);

  // Notice edits made by another app while we had the file open.
  useEffect(() => {
    const check = async () => {
      const target = pathRef.current;
      if (!target || diskMtime.current === null) return;
      try {
        const meta = await fileMeta(target);
        if (meta.modifiedMs && meta.modifiedMs > diskMtime.current + 1) {
          setStaleOnDisk(true);
        }
      } catch {
        // The file may have been moved; leave the flag alone.
      }
    };
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, []);

  const reloadFromDisk = useCallback(async () => {
    const target = pathRef.current;
    if (!target) return;
    if (!(await guardUnsaved())) return;
    try {
      const document = await readDocument(target);
      applyLoadedContent(document.content, document.path);
      notify("Reloaded from disk");
    } catch (error) {
      await reportError("Could not reload file", error);
    }
  }, [applyLoadedContent, guardUnsaved, notify]);

  // Closing with unsaved work asks first.
  useEffect(() => {
    const appWindow = getCurrentWindow();
    const unlisten = appWindow.onCloseRequested(async (event) => {
      if (forceClose.current || !dirty) return;
      event.preventDefault();
      if (await confirmDiscard(baseName(pathRef.current))) {
        forceClose.current = true;
        await appWindow.close();
      }
    });
    return () => {
      void unlisten.then((off) => off());
    };
  }, [dirty]);

  return {
    path,
    name,
    dirty,
    saving,
    lastSavedAt,
    recent,
    staleOnDisk,
    newDocument,
    openDialog,
    openPath,
    save,
    saveAs,
    touch,
    reloadFromDisk,
    dismissStale: () => setStaleOnDisk(false),
  };
}
