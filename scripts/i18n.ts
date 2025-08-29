import fs from "fs-extra";

import { r, log } from "./utils";

export interface Locale {
  extName: string;
  extDescription: string;
}

export const locales: Record<"en" | "zh_CN" | "zh_TW", Locale> = {
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

function writeLocales() {
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

void writeLocales();
