import { defineConfig } from "vite";
import { sharedConfig } from "./vite.config.shared.mjs";
import { backgroundEntry, isDev, r } from "./scripts/utils.js";
import packageJson from "./package.json" with { type: "json" };

// bundling the content script using Vite
export default defineConfig({
  ...sharedConfig,
  build: {
    watch: isDev ? {} : undefined,
    outDir: r("extension", backgroundEntry.split("/").slice(0, -1).join("/")),
    cssCodeSplit: false,
    emptyOutDir: false,
    sourcemap: isDev ? "inline" : false,
    lib: {
      entry: r("src/background/main.ts"),
      name: packageJson.name,
      formats: ["iife"],
    },
    rolldownOptions: {
      output: {
        entryFileNames: backgroundEntry.split("/").at(-1),
        extend: true,
      },
    },
  },
});
