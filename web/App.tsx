import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditor, useEditorState } from "@tiptap/react";

import { EditorPane } from "@/components/EditorPane";
import { LinkDialog } from "@/components/LinkDialog";
import { MathDialog } from "@/components/MathDialog";
import { Notice, type NoticeState } from "@/components/Notice";
import { OutlinePanel } from "@/components/OutlinePanel";
import { PreferencesSheet } from "@/components/PreferencesSheet";
import { ShortcutsSheet } from "@/components/ShortcutsSheet";
import { SourceEditor } from "@/components/SourceEditor";
import { StatusBar } from "@/components/StatusBar";
import { TitleBar } from "@/components/TitleBar";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { runEditorAction } from "@/editor/actions";
import { buildExtensions } from "@/editor/extensions";
import { onMathClick, type MathTarget } from "@/editor/mathBridge";
import { HostProvider } from "@/host/context";
import { usePreferences } from "@/hooks/usePreferences";
import { useShortcuts } from "@/hooks/useShortcuts";
import { copyText } from "@/lib/clipboard";
import { documentMarkdown } from "@/lib/markdown";
import { activeOutlineIndex, extractOutline, type OutlineItem } from "@/lib/outline";
import { computeStats } from "@/lib/stats";
import { WELCOME_DOCUMENT } from "@/lib/welcome";

import { createBrowserHost } from "./host";
import { loadDraft, useWebDocument } from "./useWebDocument";

/** Actions this shell understands; a superset of the editor's own vocabulary. */
type Action = string;

export default function App() {
  const { preferences, set, toggle } = usePreferences();

  const [sourceMode, setSourceMode] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [mathTarget, setMathTarget] = useState<MathTarget | null>(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

  const touchRef = useRef<() => void>(() => {});
  const promptImageRef = useRef<() => Promise<void>>(async () => {});
  const sourceModeRef = useRef(sourceMode);
  const sourceTextRef = useRef(sourceText);
  sourceModeRef.current = sourceMode;
  sourceTextRef.current = sourceText;

  const notify = useCallback((message: string, tone: "info" | "error" = "info") => {
    setNotice({ message, tone });
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(timer);
  }, [notice]);

  const host = useMemo(() => createBrowserHost(notify), [notify]);

  const editor = useEditor(
    {
      extensions: buildExtensions({
        onLink: () => setLinkOpen(true),
        onImage: () => void promptImageRef.current(),
        onMath: () => setMathTarget({ kind: "block", latex: "", pos: -1 }),
      }),
      content: "",
      contentType: "markdown",
      autofocus: false,
      editorProps: { attributes: { class: "mt-prose" } },
      onUpdate: () => touchRef.current(),
    },
    [],
  );

  const getContent = useCallback(
    () => (sourceModeRef.current ? sourceTextRef.current : documentMarkdown(editor)),
    [editor],
  );

  const session = useWebDocument({
    editor,
    getContent,
    onBeforeLoad: () => setSourceMode(false),
    autosave: preferences.autosave,
    notify,
  });

  touchRef.current = session.touch;

  // Seed from the crash-recovery draft, or the welcome document on a first visit.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    const draft = loadDraft();
    session.restore(draft?.text ?? WELCOME_DOCUMENT, draft?.name ?? "Untitled.md");
  }, [session]);

  useEffect(() => onMathClick(setMathTarget), []);

  useEffect(() => {
    editor.setOptions({
      editorProps: {
        attributes: { class: "mt-prose", spellcheck: String(preferences.spellcheck) },
      },
    });
  }, [editor, preferences.spellcheck]);

  const promptImage = useCallback(async () => {
    const src = await host.pickImage();
    if (src) editor.chain().focus().setImage({ src, alt: "" }).run();
  }, [editor, host]);

  promptImageRef.current = promptImage;

  const toggleSourceMode = useCallback(() => {
    if (sourceMode) {
      editor.commands.setContent(sourceText, { contentType: "markdown", emitUpdate: false });
      setSourceMode(false);
      session.touch();
    } else {
      setSourceText(documentMarkdown(editor));
      setSourceMode(true);
    }
  }, [editor, session, sourceMode, sourceText]);

  const handleAction = useCallback(
    async (action: Action) => {
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
          return notify("Not available in the browser — use Save to download the file");
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
        promptImage: () => void promptImageRef.current(),
        promptMath: () => setMathTarget({ kind: "block", latex: "", pos: -1 }),
      });
    },
    [editor, getContent, notify, preferences.theme, session, set, sourceMode, toggle, toggleSourceMode],
  );

  const actionRef = useRef(handleAction);
  actionRef.current = handleAction;
  const dispatch = useCallback((action: Action) => {
    void actionRef.current(action);
  }, []);

  useShortcuts(dispatch);

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
      editor.chain().focus().setTextSelection(item.pos + 1).scrollIntoView().run();
    },
    [editor],
  );

  return (
    <HostProvider adapter={host}>
      <TooltipProvider>
        <div className="flex h-full flex-col bg-canvas text-ink">
          <TitleBar
            variant="web"
            name={session.name}
            dirty={session.dirty}
            saving={session.saving}
            recent={[]}
            preferences={preferences}
            onAction={dispatch}
            onOpenRecent={() => undefined}
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
                onEditLink={() => setLinkOpen(true)}
              />
            )}
          </div>

          <StatusBar
            path={session.name}
            home={null}
            stats={stats}
            dirty={session.dirty}
            saving={session.saving}
            lastSavedAt={session.lastSavedAt}
            autosave={preferences.autosave}
            staleOnDisk={false}
            sourceMode={sourceMode}
            onToggleAutosave={() => toggle("autosave")}
            onReload={() => undefined}
          />
        </div>

        <LinkDialog editor={editor} open={linkOpen} onClose={() => setLinkOpen(false)} />
        <MathDialog editor={editor} target={mathTarget} onClose={() => setMathTarget(null)} />
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
