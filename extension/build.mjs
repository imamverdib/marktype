/**
 * Builds both halves of the extension.
 *
 * The host bundle is CommonJS for the extension host; the webview bundle is a
 * normal Vite build of the shared React editor, emitted with predictable names
 * so the CSP-locked HTML can reference them.
 */
import { fileURLToPath } from "node:url";
import path from "node:path";

import esbuild from "esbuild";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { build as viteBuild } from "vite";

const extensionDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(extensionDir, "..");
const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

async function buildHost() {
  const options = {
    entryPoints: [path.join(extensionDir, "src/extension.ts")],
    outfile: path.join(extensionDir, "out/extension.js"),
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    // Provided by the extension host at runtime.
    external: ["vscode"],
    sourcemap: !production,
    minify: production,
    logLevel: "warning",
  };

  if (!watch) {
    await esbuild.build(options);
    return;
  }
  const context = await esbuild.context(options);
  await context.watch();
}

async function buildWebview() {
  await viteBuild({
    configFile: false,
    root: extensionDir,
    base: "./",
    logLevel: "warn",
    plugins: [react(), tailwindcss()],
    resolve: { alias: { "@": path.join(repoRoot, "src") } },
    build: {
      outDir: path.join(extensionDir, "media"),
      emptyOutDir: true,
      target: "safari16",
      minify: production,
      sourcemap: !production,
      watch: watch ? {} : null,
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        input: path.join(extensionDir, "webview/main.tsx"),
        output: {
          entryFileNames: "webview.js",
          chunkFileNames: "assets/[name]-[hash].js",
          // The HTML references one fixed stylesheet name.
          assetFileNames: (asset) =>
            asset.names?.some((name) => name.endsWith(".css"))
              ? "webview.css"
              : "assets/[name]-[hash][extname]",
        },
      },
    },
  });
}

await Promise.all([buildHost(), buildWebview()]);
console.log(`MarkType extension built${production ? " (production)" : ""}`);
