/* eslint-disable no-console */
import { createApp } from "vue";
import App from "./views/App.vue";
import WebsiteInjector from "./websiteInjector.mjs";
import { MangaWebPageWorker } from "./manga";

function mountMangaReader(mangaWorker: MangaWebPageWorker) {
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

  const app = createApp(App, { mangaWorker });
  const component = app.mount(root) as InstanceType<typeof App>;
  return { component, channel: component.channel };
}

// Firefox `browser.tabs.executeScript()` requires scripts return a primitive value
(() => {
  // communication example: send previous tab title from background page
  WebsiteInjector.inject().then(({ mangaWorker }) => {
    const { channel, component } =
      (mangaWorker && mountMangaReader(mangaWorker)) || {};
    __DEV__ && Object.assign(self, {
      channel,
      mangaWorker,
      mangaReader: component,
    });
    if (mangaWorker && channel) {
      mangaWorker.subscribeReaderChannel(channel);
    }
  });
})();
