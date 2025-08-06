import fs from "fs-extra";

import { r, log } from "./utils";
import { Manifest } from "webextension-polyfill";
interface Locale {
  extName: string;
  extDescription: string;
}

const locales: Record<"en" | "zh_CN" | "zh_TW", Locale> = {
  en: {
    extName: "Manga Reader",
    extDescription: "Manga reader that helps enhance the manga reading experience.",
  },
  zh_CN: {
    extName: "漫画阅读器",
    extDescription: "漫画阅读器,帮助提高漫画阅读体验。",
  },
  zh_TW: {
    extName: "漫畫閱讀器",
    extDescription: "漫畫閱讀器,幫助提高漫畫閱讀體驗。",
  },
};

export function writeLocales() {
  for (const [key, value] of Object.entries(locales)) {
    const dir = r(`extension/_locales/${key}`);
    fs.mkdirpSync(dir);
    const jsonData = Object.entries(value).reduce(
      (a, [k, v]) => ({ ...a, [k]: { message: v } }),
      {},
    );
    fs.writeJSONSync(r(dir, "messages.json"), jsonData, { spaces: 2 });
  }
  log("PRE", "write locales");
}

export function buildManifest(manifest: Manifest.WebExtensionManifest) {
  manifest.default_locale = "en";
  const enMap = new Map(Object.entries(locales["en"]).map(([k, v]) => [v, k]));
  const stack = [manifest as unknown as Record<string, unknown>];
  while (stack.length > 0) {
    const node = stack.shift()!;
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === "string" && enMap.has(v)) {
        const code = enMap.get(v)!;
        node[k] = `__MSG_${code}__`;
      } else if (typeof v === "object") {
        stack.push(v as Record<string, unknown>);
      }
    }
  }
  return manifest;
}
