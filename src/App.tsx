import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { homeDir } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useEditor, useEditorState } from "@tiptap/react";

import { EditorPane } from "./components/EditorPane";
import { LinkDialog } from "./components/LinkDialog";
import { MathDialog } from "./components/MathDialog";
import { Notice, type NoticeState } from "./components/Notice";
import { OutlinePanel } from "./components/OutlinePanel";
import { PreferencesSheet } from "./components/PreferencesSheet";
import { ShortcutsSheet } from "./components/ShortcutsSheet";
import { SourceEditor } from "./components/SourceEditor";
import { StatusBar } from "./components/StatusBar";
import { TitleBar } from "./components/TitleBar";
import { TooltipProvider } from "./components/ui/Tooltip";
import { runEditorAction } from "./editor/actions";
import { buildExtensions } from "./editor/extensions";
import { onMathClick, type MathTarget } from "./editor/mathBridge";
import { useDocumentSession } from "./hooks/useDocumentSession";
import { useFileDrop } from "./hooks/useFileDrop";
import { usePreferences } from "./hooks/usePreferences";
import { useShortcuts } from "./hooks/useShortcuts";
import { HostProvider } from "./host/context";
import type { HostAdapter } from "./host/types";
import { copyText } from "./lib/clipboard";
import { documentMarkdown } from "./lib/markdown";
import {
  importImage,
  importImageBytes,
  pickImage,
  reportError,
  revealInFinder,
} from "./lib/files";
import { onMenuAction, type MenuAction } from "./lib/menu";
import { activeOutlineIndex, extractOutline, type OutlineItem } from "./lib/outline";
import { computeStats } from "./lib/stats";
import { WELCOME_DOCUMENT } from "./lib/welcome";

export default function App() {
  const { preferences, set, toggle } = usePreferences();

  const [sourceMode, setSourceMode] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [mathTarget, setMathTarget] = useState<MathTarget | null>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [home, setHome] = useState<string | null>(null);

  /** Set once the session exists; the editor's onUpdate reaches it from here. */
  const touchRef = useRef<() => void>(() => {});
  /** The editor is built once, so its shortcuts reach the picker through here. */
  const promptImageRef = useRef<() => Promise<void>>(async () => {});
  const sourceModeRef = useRef(sourceMode);
  const sourceTextRef = useRef(sourceText);
  sourceModeRef.current = sourceMode;
  sourceTextRef.current = sourceText;

  const editor = useEditor(
    {
      extensions: buildExtensions({
        onLink: () => setLinkOpen(true),
        onImage: () => void promptImageRef.current(),
        onMath: () => setMathTarget({ kind: "block", latex: "", pos: -1 }),
      }),
      content: WELCOME_DOCUMENT,
      contentType: "markdown",
      autofocus: "start",
      editorProps: {
        attributes: { class: "mt-prose", spellcheck: "true" },
      },
      onUpdate: () => touchRef.current(),
    },
    [],
  );

  const notify = useCallback((message: string, tone: "info" | "error" = "info") => {
    setNotice({ message, tone });
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(timer);
  }, [notice]);

  /** What would be written to disk right now. */
  const getContent = useCallback(
    () => (sourceModeRef.current ? sourceTextRef.current : documentMarkdown(editor)),
    [editor],
  );

  const session = useDocumentSession({
    editor,
    getContent,
    onBeforeLoad: () => setSourceMode(false),
    autosave: preferences.autosave,
    notify,
  });

  touchRef.current = session.touch;

  const dropping = useFileDrop({
    editor,
    documentPath: session.path,
    onOpenPath: session.openPath,
  });

  // Reveal the window once the first themed frame is on screen.
  useEffect(() => {
    const window = getCurrentWindow();
    void window.show().then(() => window.setFocus());
    void homeDir()
      .then(setHome)
      .catch(() => setHome(null));
  }, []);

  // Formulas are atoms; clicking one opens the LaTeX editor.
  useEffect(() => onMathClick(setMathTarget), []);

  // Spell check lives on the contenteditable element itself.
  useEffect(() => {
    editor.setOptions({
      editorProps: {
        attributes: {
          class: "mt-prose",
          spellcheck: String(preferences.spellcheck),
        },
      },
    });
  }, [editor, preferences.spellcheck]);

  const toggleSourceMode = useCallback(() => {
    if (sourceMode) {
      editor.commands.setContent(sourceText, {
        contentType: "markdown",
        emitUpdate: false,
      });
      setSourceMode(false);
      session.touch();
    } else {
      setSourceText(documentMarkdown(editor));
      setSourceMode(true);
    }
  }, [editor, session, sourceMode, sourceText]);

  /** Everything the shared editor core needs from the desktop shell. */
  const host = useMemo<HostAdapter>(
    () => ({
      kind: "desktop",
      openExternal: (href) => void openUrl(href).catch(() => undefined),
      openDocument: (href) => {
        const base = session.path;
        const absolute = href.startsWith("/")
          ? href
          : base
            ? `${base.slice(0, base.lastIndexOf("/"))}/${href}`
            : null;
        if (absolute) void session.openPath(absolute);
      },
      saveImageBytes: (bytes, extension) =>
        importImageBytes(bytes, extension, session.path),
      pickImage: async () => {
        const picked = await pickImage();
        return picked ? importImage(picked, session.path) : null;
      },
      reportError: (title, error) => void reportError(title, error),
    }),
    [session.openPath, session.path],
  );

  const promptImage = useCallback(async () => {
    try {
      const src = await host.pickImage();
      if (src) editor.chain().focus().setImage({ src, alt: "" }).run();
    } catch (error) {
      await reportError("Could not insert image", error);
    }
  }, [editor, host]);

  promptImageRef.current = promptImage;

  const handleAction = useCallback(
    async (action: MenuAction) => {
      switch (action) {
        case "new":
          return session.newDocument();
        case "open":
          return session.openDialog();
        case "save":
          await session.save();
          return;
        case "save-as":
          await session.saveAs();
          return;
        case "reveal":
          if (!session.path) return notify("Save the document first", "error");
          await revealInFinder(session.path);
          return;
        case "copy-markdown": {
          const copied = await copyText(getContent());
          notify(
            copied ? "Markdown copied to the clipboard" : "Could not reach the clipboard",
            copied ? "info" : "error",
          );
          return;
        }
        case "toggle-outline":
          return toggle("showOutline");
        case "toggle-theme":
          return set("theme", preferences.theme === "dark" ? "light" : "dark");
        case "toggle-typewriter":
          return toggle("typewriter");
        case "toggle-focus-mode":
          return toggle("focusMode");
        case "toggle-autosave":
          return toggle("autosave");
        case "toggle-source":
          return toggleSourceMode();
        case "preferences":
          return setPreferencesOpen(true);
        case "shortcuts":
          return setShortcutsOpen(true);
        default:
          break;
      }

      if (sourceMode) {
        notify("Leave source mode to use formatting commands");
        return;
      }

      runEditorAction(editor, action, {
        promptLink: () => setLinkOpen(true),
        promptImage: () => void promptImage(),
        promptMath: () => setMathTarget({ kind: "block", latex: "", pos: -1 }),
      });
    },
    [
      editor,
      getContent,
      notify,
      preferences.theme,
      promptImage,
      session,
      set,
      sourceMode,
      toggle,
      toggleSourceMode,
    ],
  );

  const actionRef = useRef(handleAction);
  actionRef.current = handleAction;

  const dispatch = useCallback((action: MenuAction) => {
    void actionRef.current(action);
  }, []);

  useShortcuts(dispatch);

  // Native menu selections.
  useEffect(() => {
    const unlisten = onMenuAction(dispatch);
    return () => {
      void unlisten.then((off) => off());
    };
  }, [dispatch]);

  // Files handed over by Finder ("Open With", double-click, `open -a`).
  useEffect(() => {
    const openFirst = (paths: string[]) => {
      if (paths.length > 0) void session.openPath(paths[0]);
    };
    void invoke<string[]>("take_pending_files").then(openFirst).catch(() => undefined);

    const unlisten = listen<string[]>("app:open-files", (event) =>
      openFirst(event.payload),
    );
    return () => {
      void unlisten.then((off) => off());
    };
    // Only the path opener matters here, and it is stable across renders.
  }, [session.openPath]);

  const outline = useEditorState({
    editor,
    selector: ({ editor: instance }) => ({
      items: extractOutline(instance),
      caret: instance.state.selection.head,
    }),
  });

  const documentText = useEditorState({
    editor,
    selector: ({ editor: instance }) => instance.getText({ blockSeparator: "\n" }),
  });

  const stats = useMemo(
    () => computeStats(sourceMode ? sourceText : documentText),
    [documentText, sourceMode, sourceText],
  );

  const goToHeading = useCallback(
    (item: OutlineItem) => {
      editor
        .chain()
        .focus()
        .setTextSelection(item.pos + 1)
        .scrollIntoView()
        .run();
    },
    [editor],
  );

  return (
    <HostProvider adapter={host}>
      <TooltipProvider>
      <div className="flex h-full flex-col bg-canvas text-ink">
        <TitleBar
          name={session.name}
          dirty={session.dirty}
          saving={session.saving}
          recent={session.recent}
          preferences={preferences}
          onAction={dispatch}
          onOpenRecent={(path) => void session.openPath(path)}
        />

        <div className="flex min-h-0 flex-1">
          {preferences.showOutline && (
            <OutlinePanel
              items={outline.items}
              activeIndex={activeOutlineIndex(outline.items, outline.caret)}
              onSelect={goToHeading}
            />
          )}

          {sourceMode ? (
            <SourceEditor
              value={sourceText}
              onChange={(value) => {
                setSourceText(value);
                sourceTextRef.current = value;
                session.touch();
              }}
            />
          ) : (
            <EditorPane
              editor={editor}
              preferences={preferences}
              dropping={dropping}
              onEditLink={() => setLinkOpen(true)}
            />
          )}
        </div>

        <StatusBar
          path={session.path}
          home={home}
          stats={stats}
          dirty={session.dirty}
          saving={session.saving}
          lastSavedAt={session.lastSavedAt}
          autosave={preferences.autosave}
          staleOnDisk={session.staleOnDisk}
          sourceMode={sourceMode}
          onToggleAutosave={() => toggle("autosave")}
          onReload={() => void session.reloadFromDisk()}
        />
      </div>

      <LinkDialog editor={editor} open={linkOpen} onClose={() => setLinkOpen(false)} />
      <MathDialog
        editor={editor}
        target={mathTarget}
        onClose={() => setMathTarget(null)}
      />
      <PreferencesSheet
        open={preferencesOpen}
        preferences={preferences}
        onClose={() => setPreferencesOpen(false)}
        onChange={set}
      />
      <ShortcutsSheet open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <Notice notice={notice} />
      </TooltipProvider>
    </HostProvider>
  );
}
