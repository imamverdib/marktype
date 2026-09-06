import * as vscode from "vscode";

import type { WebviewSettings } from "./protocol";

export const SECTION = "marktype";

/** Reads the extension's settings, scoped to the document being edited. */
export function readSettings(resource?: vscode.Uri): WebviewSettings {
  const config = vscode.workspace.getConfiguration(SECTION, resource);
  const editor = vscode.workspace.getConfiguration("editor", resource);

  return {
    fontFamily: config.get<WebviewSettings["fontFamily"]>("fontFamily", "sans"),
    fontSize: Math.max(0, config.get<number>("fontSize", 0)),
    editorFontSize: editor.get<number>("fontSize", 14),
    editorFontFamily: editor.get<string>("fontFamily", "monospace"),
    lineWidth: config.get<number>("lineWidth", 46),
    typewriter: config.get<boolean>("typewriterMode", false),
    focusMode: config.get<boolean>("focusMode", false),
    spellcheck: config.get<boolean>("spellcheck", true),
  };
}

export function imageFolder(resource?: vscode.Uri): string {
  const folder = vscode.workspace
    .getConfiguration(SECTION, resource)
    .get<string>("imageFolder", "assets")
    .trim();
  // Keep it a single relative segment path; anything escaping upwards is a bug.
  return folder.replace(/^\/+/, "").replace(/\.\.\//g, "") || "assets";
}

/** Persists a toggled view option so it survives reopening the editor. */
export async function toggleSetting(key: "typewriterMode" | "focusMode") {
  const config = vscode.workspace.getConfiguration(SECTION);
  const current = config.get<boolean>(key, false);
  await config.update(key, !current, vscode.ConfigurationTarget.Global);
}
