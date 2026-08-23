import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

/** Browser build of the editor, deployed as a Hugging Face static Space. */
export default defineConfig({
  root: __dirname,
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "../src") },
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    target: "safari16",
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: { katex: ["katex"], highlight: ["lowlight", "highlight.js"] },
      },
    },
  },
});
