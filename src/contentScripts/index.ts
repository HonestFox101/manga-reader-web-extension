/* eslint-disable no-console */
import { createApp } from "vue";
import App from "./views/MangaReader.vue";
import WebsiteInjector from "./websiteInjector";
import type { MangaWebPageWorker } from "./types";

import "~/styles";

function buildMangaVueApp(mangaWorker: MangaWebPageWorker) {
  const container = document.createElement("div");
  container.id = __NAME__;
  const root = document.createElement("div");
  const styleEl = document.createElement("link");
  const shadowDOM = container.attachShadow?.({ mode: __DEV__ ? "open" : "closed" }) || container;
  styleEl.setAttribute("rel", "stylesheet");
  styleEl.setAttribute("href", browser.runtime.getURL("dist/contentScripts/index.css"));
  shadowDOM.appendChild(styleEl);
  shadowDOM.appendChild(root);
  document.body.appendChild(container);

  const app = createApp(App, { mangaWorker });
  const component = app.mount(root) as InstanceType<typeof App>;
  return { component, channel: component.channel };
}

async function setup() {
  const { mangaWorker } = await WebsiteInjector.inject();
  const { channel, component } = (mangaWorker && buildMangaVueApp(mangaWorker)) || {};
  __DEV__ &&
    Object.assign(self, {
      channel,
      mangaWorker,
      mangaReader: component,
    });
  if (mangaWorker && channel) {
    mangaWorker.subscribeReaderChannel(channel);
  }
}

void setup();

// (() => {
//   const container = document.createElement('div');
//   container.id = __NAME__;
//   const root = document.createElement('div');
//   const styleEl = document.createElement('link');
//   const shadowDOM = container.attachShadow?.({ mode: __DEV__ ? 'open' : 'closed' }) || container;
//   styleEl.setAttribute('rel', 'stylesheet');
//   styleEl.setAttribute('href', browser.runtime.getURL('dist/contentScripts/index.css'));
//   shadowDOM.appendChild(styleEl);
//   shadowDOM.appendChild(root);
//   document.body.appendChild(container);

//   const scriptEl = document.createElement('script');
//   scriptEl.setAttribute('type', 'module');
//   scriptEl.setAttribute('src', 'http://localhost:3303/contentScripts/main.ts'); // TODO: Adjust for production envirement
//   shadowDOM.appendChild(scriptEl)
// })();
