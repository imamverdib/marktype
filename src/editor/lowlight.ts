import { createLowlight } from "lowlight";

import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import diff from "highlight.js/lib/languages/diff";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import go from "highlight.js/lib/languages/go";
import graphql from "highlight.js/lib/languages/graphql";
import ini from "highlight.js/lib/languages/ini";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import kotlin from "highlight.js/lib/languages/kotlin";
import lua from "highlight.js/lib/languages/lua";
import markdown from "highlight.js/lib/languages/markdown";
import objectivec from "highlight.js/lib/languages/objectivec";
import php from "highlight.js/lib/languages/php";
import plaintext from "highlight.js/lib/languages/plaintext";
import python from "highlight.js/lib/languages/python";
import ruby from "highlight.js/lib/languages/ruby";
import rust from "highlight.js/lib/languages/rust";
import scss from "highlight.js/lib/languages/scss";
import shell from "highlight.js/lib/languages/shell";
import sql from "highlight.js/lib/languages/sql";
import swift from "highlight.js/lib/languages/swift";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

/**
 * A hand-picked grammar set instead of `common`: it keeps the bundle small
 * while covering the languages a Markdown note actually contains.
 */
export const lowlight = createLowlight({
  bash,
  c,
  cpp,
  csharp,
  css,
  diff,
  dockerfile,
  go,
  graphql,
  ini,
  java,
  javascript,
  json,
  kotlin,
  lua,
  markdown,
  objectivec,
  php,
  plaintext,
  python,
  ruby,
  rust,
  scss,
  shell,
  sql,
  swift,
  typescript,
  xml,
  yaml,
});

/**
 * Fence languages people actually type. Registering them as aliases keeps the
 * author's own spelling in the Markdown while still highlighting the block,
 * and keeps them out of the code-block language picker.
 */
lowlight.registerAlias({
  javascript: ["js", "jsx", "mjs", "cjs", "node"],
  typescript: ["ts", "tsx", "mts"],
  bash: ["sh", "zsh", "console"],
  cpp: ["c++", "cc", "hpp"],
  csharp: ["cs", "dotnet"],
  objectivec: ["objective-c", "objc", "mm"],
  python: ["py", "python3"],
  ruby: ["rb"],
  rust: ["rs"],
  yaml: ["yml"],
  xml: ["html", "svg", "vue", "xhtml"],
  markdown: ["md", "mdown", "mkd"],
  plaintext: ["text", "txt", "plain"],
  ini: ["toml", "conf"],
  json: ["jsonc", "json5"],
  kotlin: ["kt", "kts"],
  dockerfile: ["docker"],
});

export const LANGUAGE_LABELS: Record<string, string> = {
  plaintext: "Plain text",
  javascript: "JavaScript",
  typescript: "TypeScript",
  csharp: "C#",
  cpp: "C++",
  objectivec: "Objective-C",
  php: "PHP",
  sql: "SQL",
  json: "JSON",
  yaml: "YAML",
  toml: "TOML",
  ini: "INI",
  css: "CSS",
  scss: "SCSS",
  xml: "HTML / XML",
  graphql: "GraphQL",
  markdown: "Markdown",
  dockerfile: "Dockerfile",
  bash: "Shell",
  shell: "Shell session",
  go: "Go",
  rust: "Rust",
  swift: "Swift",
  kotlin: "Kotlin",
  java: "Java",
  python: "Python",
  ruby: "Ruby",
  lua: "Lua",
  diff: "Diff",
  c: "C",
};

export const languageLabel = (name: string) =>
  LANGUAGE_LABELS[name] ?? name.charAt(0).toUpperCase() + name.slice(1);
