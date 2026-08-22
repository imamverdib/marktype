import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditor, useEditorState } from "@tiptap/react";

import { EditorPane } from "@/components/EditorPane";
import { LinkDialog } from "@/components/LinkDialog";
import { MathDialog } from "@/components/MathDialog";
import { OutlinePanel } from "@/components/OutlinePanel";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { runEditorAction } from "@/editor/actions";
import { buildExtensions } from "@/editor/extensions";
import { onMathClick, type MathTarget } from "@/editor/mathBridge";
import { HostProvider } from "@/host/context";
import type { HostAdapter } from "@/host/types";
import { setLocalAssetResolver } from "@/lib/assets";
import { documentMarkdown } from "@/lib/markdown";
import { activeOutlineIndex, extractOutline, type OutlineItem } from "@/lib/outline";
import type { Preferences } from "@/lib/settings";
import { computeStats } from "@/lib/stats";

import { onHostMessage, post, request } from "./bridge";
import type { AssetBase, EditorCommand, WebviewSettings } from "../src/protocol";

/** How long typing settles before the document edit is sent to the host. */
const CHANGE_DEBOUNCE_MS = 120;

const FALLBACK_SETTINGS: WebviewSettings = {
  fontFamily: "sans",
  fontSize: 0,
  editorFontSize: 14,
  editorFontFamily: "monospace",
  lineWidth: 46,
  showOutline: true,
  typewriter: false,
  focusMode: false,
  spellcheck: true,
};

/** Relative Markdown paths resolve through the webview URIs the host sent. */
function installAssetBase(base: AssetBase) {
  setLocalAssetResolver((src) => {
    if (src.startsWith("/")) {
      return base.workspaceRoot ? `${base.workspaceRoot}${encodeURI(src)}` : src;
    }
    return base.documentDir ? `${base.documentDir}/${encodeURI(src)}` : src;
  });
}

/** Pushes the metrics the IDE settings control onto the document root. */
function applyMetrics(settings: WebviewSettings) {
  const family =
    settings.fontFamily === "editor"
      ? settings.editorFontFamily
      : `var(--mt-font-${settings.fontFamily === "sans" ? "body" : settings.fontFamily})`;

  const root = document.documentElement;
  root.style.setProperty("--mt-font-family", family);
  root.style.setProperty(
    "--mt-font-size",
    `${settings.fontSize || settings.editorFontSize + 2}px`,
  );
  root.style.setProperty("--mt-measure", `${settings.lineWidth}rem`);
}

/** The shared components take the desktop preferences shape. */
function toPreferences(settings: WebviewSettings): Preferences {
  return {
    theme: document.body.classList.contains("vscode-light") ? "light" : "dark",
    fontFamily: settings.fontFamily === "editor" ? "mono" : settings.fontFamily,
    fontSize: settings.fontSize || settings.editorFontSize + 2,
    measure: settings.lineWidth,
    autosave: false,
    showOutline: settings.showOutline,
    typewriter: settings.typewriter,
    focusMode: settings.focusMode,
    spellcheck: settings.spellcheck,
  };
}

export function Shell() {
  const [settings, setSettings] = useState<WebviewSettings>(FALLBACK_SETTINGS);
  const [linkOpen, setLinkOpen] = useState(false);
  const [mathTarget, setMathTarget] = useState<MathTarget | null>(null);

  const promptImageRef = useRef<() => Promise<void>>(async () => {});
  const changeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sendChangeRef = useRef<() => void>(() => {});

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
      onUpdate: () => {
        if (changeTimer.current) clearTimeout(changeTimer.current);
        changeTimer.current = setTimeout(() => sendChangeRef.current(), CHANGE_DEBOUNCE_MS);
      },
    },
    [],
  );

  const host = useMemo<HostAdapter>(
    () => ({
      kind: "editor-extension",
      openExternal: (href) => post({ type: "openExternal", href }),
      openDocument: (href) => post({ type: "openDocument", href }),
      saveImageBytes: (bytes, extension) =>
        request((id) => ({
          type: "saveImage",
          id,
          bytes: Array.from(bytes),
          extension,
        })),
      pickImage: () => request((id) => ({ type: "pickImage", id })),
      reportError: (title, error) =>
        post({
          type: "error",
          message: `${title}: ${error instanceof Error ? error.message : String(error)}`,
        }),
    }),
    [],
  );

  const sendStats = useCallback(() => {
    const stats = computeStats(editor.getText({ blockSeparator: "\n" }));
    post({
      type: "stats",
      words: stats.words,
      characters: stats.characters,
      readingMinutes: stats.readingMinutes,
    });
  }, [editor]);

  const sendChange = useCallback(() => {
    post({ type: "change", text: documentMarkdown(editor) });
    sendStats();
  }, [editor, sendStats]);

  sendChangeRef.current = sendChange;

  /** Replaces the document with the host's text, keeping the caret roughly put. */
  const applyRemote = useCallback(
    (text: string) => {
      if (documentMarkdown(editor) === text) return;
      const { anchor } = editor.state.selection;
      editor.commands.setContent(text, { contentType: "markdown", emitUpdate: false });
      const size = editor.state.doc.content.size;
      editor.commands.setTextSelection(Math.min(anchor, Math.max(1, size - 1)));
    },
    [editor],
  );

  const promptImage = useCallback(async () => {
    const src = await host.pickImage();
    if (src) editor.chain().focus().setImage({ src, alt: "" }).run();
  }, [editor, host]);

  promptImageRef.current = promptImage;

  const runCommand = useCallback(
    (command: EditorCommand) => {
      runEditorAction(editor, command, {
        promptLink: () => setLinkOpen(true),
        promptImage: () => void promptImageRef.current(),
        promptMath: () => setMathTarget({ kind: "block", latex: "", pos: -1 }),
      });
    },
    [editor],
  );

  // Formulas are atoms; clicking one opens the LaTeX editor.
  useEffect(() => onMathClick(setMathTarget), []);

  useEffect(() => {
    const off = onHostMessage((message) => {
      switch (message.type) {
        case "init":
          installAssetBase(message.assetBase);
          setSettings(message.settings);
          applyRemote(message.text);
          // `false`: setEditable emits an update by default, which would
          // report a change and dirty the tab before the user typed.
          editor.setEditable(!message.readOnly, false);
          editor.commands.focus("start");
          // Stats only: opening a document must not mark it dirty.
          sendStats();
          return;
        case "document":
          applyRemote(message.text);
          return;
        case "settings":
          setSettings(message.settings);
          return;
        case "command":
          runCommand(message.command);
          return;
        case "flush":
          post({ type: "flushed", token: message.token, text: documentMarkdown(editor) });
          return;
        default:
          return;
      }
    });

    post({ type: "ready" });
    return off;
  }, [applyRemote, editor, runCommand, sendStats]);

  // A save can come from anywhere in the IDE, so don't sit on pending keystrokes.
  useEffect(() => {
    const flushNow = () => {
      if (!changeTimer.current) return;
      clearTimeout(changeTimer.current);
      changeTimer.current = undefined;
      sendChangeRef.current();
    };
    window.addEventListener("blur", flushNow);
    return () => window.removeEventListener("blur", flushNow);
  }, []);

  useEffect(() => {
    applyMetrics(settings);
    editor.setOptions({
      editorProps: {
        attributes: { class: "mt-prose", spellcheck: String(settings.spellcheck) },
      },
    });
  }, [editor, settings]);

  const outline = useEditorState({
    editor,
    selector: ({ editor: instance }) => ({
      items: extractOutline(instance),
      caret: instance.state.selection.head,
    }),
  });

  const preferences = useMemo(() => toPreferences(settings), [settings]);

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
        <div className="flex h-full bg-canvas text-ink">
          {preferences.showOutline && (
            <OutlinePanel
              items={outline.items}
              activeIndex={activeOutlineIndex(outline.items, outline.caret)}
              onSelect={goToHeading}
            />
          )}
          <EditorPane
            editor={editor}
            preferences={preferences}
            onEditLink={() => setLinkOpen(true)}
          />
        </div>

        <LinkDialog editor={editor} open={linkOpen} onClose={() => setLinkOpen(false)} />
        <MathDialog
          editor={editor}
          target={mathTarget}
          onClose={() => setMathTarget(null)}
        />
      </TooltipProvider>
    </HostProvider>
  );
}
