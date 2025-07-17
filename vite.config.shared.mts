import { dirname, relative } from "node:path";
import type { UserConfig } from "vite";
import Vue from "@vitejs/plugin-vue";
import Icons from "unplugin-icons/vite";
import IconsResolver from "unplugin-icons/resolver";
import Components from "unplugin-vue-components/vite";
import AutoImport from "unplugin-auto-import/vite";

import { isDev, r } from "./scripts/utils.js";
import packageJson from "./package.json" with { type: "json" };

export const sharedConfig: UserConfig = {
  root: r("src"),
  resolve: {
    alias: {
      "~/": `${r("src")}/`,
    },
  },
  define: {
    __DEV__: isDev,
    __NAME__: JSON.stringify(packageJson.name),
  },
  plugins: [
    Vue(),

    AutoImport({
      imports: [
        "vue",
        {
          "webextension-polyfill": [["=", "browser"]],
        },
        {
          emittery: [["default", "Emittery"]],
        },
      ],
      dts: r("src/auto-imports.d.ts"),
    }),

    // https://github.com/antfu/unplugin-vue-components
    Components({
      dirs: [r("src/components")],
      // generate `components.d.ts` for ts support with Volar
      dts: r("src/components.d.ts"),
      resolvers: [
        // auto import icons
        IconsResolver({
          prefix: "",
        }),
      ],
    }),

    // https://github.com/antfu/unplugin-icons
    Icons(),

    // rewrite assets to use relative path
    {
      name: "assets-rewrite",
      enforce: "post",
      apply: "build",
      transformIndexHtml(html, { path }) {
        return html.replace(/"\/assets\//g, `"${relative(dirname(path), "/assets")}/`);
      },
    },
  ],
  optimizeDeps: {
    include: ["vue", "@vueuse/core", "webextension-polyfill"],
    exclude: ["vue-demi"],
  },
};
