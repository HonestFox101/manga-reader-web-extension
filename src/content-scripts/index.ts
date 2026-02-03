/* eslint-disable no-console */
import { createApp } from "vue";
import App from "./views/App.vue";

import "~/styles/main.scss";

// 脚本入口：仅负责创建 DOM 容器和挂载 Vue 应用
function setup() {
  const container = document.createElement("div");
  container.id = __NAME__;
  const root = document.createElement("div");
  const styleEl = document.createElement("link");
  const shadowDOM = container.attachShadow?.({ mode: __DEV__ ? "open" : "closed" }) || container;
  styleEl.setAttribute("rel", "stylesheet");
  styleEl.setAttribute("href", browser.runtime.getURL("dist/content-scripts/index.css"));
  shadowDOM.appendChild(styleEl);
  shadowDOM.appendChild(root);
  document.body.appendChild(container);

  const app = createApp(App);
  app.mount(root);
}

void setup();
