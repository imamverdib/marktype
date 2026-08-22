import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { ask, message, open, save } from "@tauri-apps/plugin-dialog";
import {
  copyFile,
  exists,
  mkdir,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { basename, dirname, join } from "@tauri-apps/api/path";

export const MARKDOWN_FILTER = {
  name: "Markdown",
  extensions: ["md", "markdown", "mdown", "mkd", "mdx", "txt"],
};

const IMAGE_FILTER = {
  name: "Images",
  extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "bmp"],
};

export type LoadedDocument = { path: string; content: string };

/** Native open panel, then read. Resolves to `null` when the user cancels. */
export async function pickAndReadDocument(): Promise<LoadedDocument | null> {
  const selected = await open({
    multiple: false,
    directory: false,
    title: "Open Markdown",
    filters: [MARKDOWN_FILTER],
  });
  if (typeof selected !== "string") return null;
  return { path: selected, content: await readTextFile(selected) };
}

export async function readDocument(path: string): Promise<LoadedDocument> {
  return { path, content: await readTextFile(path) };
}

/** Native save panel. Adds a `.md` extension when the user omits one. */
export async function pickSavePath(suggestedName: string): Promise<string | null> {
  const chosen = await save({
    title: "Save Markdown",
    defaultPath: suggestedName,
    filters: [MARKDOWN_FILTER],
  });
  if (!chosen) return null;
  return /\.[A-Za-z0-9]+$/.test(chosen) ? chosen : `${chosen}.md`;
}

export async function writeDocument(path: string, content: string) {
  await writeTextFile(path, content);
}

export async function confirmDiscard(name: string): Promise<boolean> {
  return ask(`“${name}” has unsaved changes. Discard them?`, {
    title: "Unsaved changes",
    kind: "warning",
    okLabel: "Discard",
    cancelLabel: "Keep editing",
  });
}

export async function reportError(title: string, detail: unknown) {
  await message(detail instanceof Error ? detail.message : String(detail), {
    title,
    kind: "error",
  });
}

export function revealInFinder(path: string) {
  return invoke<void>("reveal_in_finder", { path });
}

export type FileMeta = {
  path: string;
  exists: boolean;
  modifiedMs: number | null;
  size: number | null;
};

export async function fileMeta(path: string): Promise<FileMeta> {
  const raw = await invoke<{
    path: string;
    exists: boolean;
    modified_ms: number | null;
    size: number | null;
  }>("file_meta", { path });
  return {
    path: raw.path,
    exists: raw.exists,
    modifiedMs: raw.modified_ms,
    size: raw.size,
  };
}

/** Native open panel filtered to images, used by Insert ▸ Image. */
export async function pickImage(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    directory: false,
    title: "Insert Image",
    filters: [IMAGE_FILTER],
  });
  return typeof selected === "string" ? selected : null;
}

/**
 * Brings a dropped or picked image into the document.
 *
 * With a saved document the file is copied into a sibling `assets/` folder and
 * referenced relatively, so the Markdown stays portable. For an unsaved
 * document there is nowhere to copy to, so the absolute path is used as-is.
 */
export async function importImage(
  imagePath: string,
  documentPath: string | null,
): Promise<string> {
  if (!documentPath) return imagePath;

  const documentDir = await dirname(documentPath);
  const assetsDir = await join(documentDir, "assets");
  const name = await basename(imagePath);

  if (imagePath.startsWith(`${assetsDir}/`)) return `assets/${name}`;

  if (!(await exists(assetsDir))) await mkdir(assetsDir, { recursive: true });

  let target = await join(assetsDir, name);
  let relative = `assets/${name}`;
  if (await exists(target)) {
    const dot = name.lastIndexOf(".");
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const extension = dot > 0 ? name.slice(dot) : "";
    const unique = `${stem}-${Date.now().toString(36)}${extension}`;
    target = await join(assetsDir, unique);
    relative = `assets/${unique}`;
  }

  await copyFile(imagePath, target);
  return relative;
}

/** Writes pasted image bytes to disk and returns a Markdown-friendly path. */
export async function importImageBytes(
  bytes: Uint8Array,
  extension: string,
  documentPath: string | null,
): Promise<string> {
  const name = `pasted-${Date.now().toString(36)}.${extension}`;
  const { writeFile } = await import("@tauri-apps/plugin-fs");

  if (!documentPath) {
    const { tempDir } = await import("@tauri-apps/api/path");
    const target = await join(await tempDir(), name);
    await writeFile(target, bytes);
    return target;
  }

  const assetsDir = await join(await dirname(documentPath), "assets");
  if (!(await exists(assetsDir))) await mkdir(assetsDir, { recursive: true });
  await writeFile(await join(assetsDir, name), bytes);
  return `assets/${name}`;
}

export { convertFileSrc };
