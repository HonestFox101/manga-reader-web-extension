/* eslint-disable no-console */
import { onMessage } from "webext-bridge/content-script";
import { createApp } from "vue";
import App from "./views/App.vue";
import { setupApp } from "~/logic/common-setup";
import WebsiteInjector from "./websiteInjector.mjs";
import Emittery from "emittery";
import type { MangaReaderEvent } from "./manga";

function mountMangaReader(mangaWorker: object) {
  const container = document.createElement("div");
  container.id = __NAME__;
  const root = document.createElement("div");
  const styleEl = document.createElement("link");
  const shadowDOM =
    container.attachShadow?.({ mode: __DEV__ ? "open" : "closed" }) ||
    container;
  styleEl.setAttribute("rel", "stylesheet");
  styleEl.setAttribute(
    "href",
    browser.runtime.getURL("dist/contentScripts/index.css")
  );
  shadowDOM.appendChild(styleEl);
  shadowDOM.appendChild(root);
  document.body.appendChild(container);
  const channel = new Emittery<MangaReaderEvent>();
  const app = createApp(App, { mangaWorker, channel });
  setupApp(app);
  app.mount(root);
  return { app, channel };
}

// Firefox `browser.tabs.executeScript()` requires scripts return a primitive value
(() => {
  // communication example: send previous tab title from background page
  onMessage("tab-prev", ({ data }) => {
    console.log(`[vitesse-webext] Navigate from page "${data.title}"`);
  });

  WebsiteInjector.inject().then(({ mangaWorker }) => {
    const reader = mangaWorker && mountMangaReader(mangaWorker);
    if (reader) {
      mangaWorker.bindReaderChannel(reader.channel);
      Object.assign(self, { mangaReader: reader, mangaWorker: mangaWorker });
    }
  });
})();
