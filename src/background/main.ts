import { onMessage, sendMessage } from "webext-bridge/background";
import type { Tabs } from "webextension-polyfill";
import { blobToBase64 } from "~/utils";

// only on dev mode
if (import.meta.hot) {
  // @ts-expect-error for background HMR
  import("/@vite/client");
  // load latest content script
  import("./contentScriptHMR");
}

// remove or turn this off if you don't use side panel
const USE_SIDE_PANEL = false;

// to toggle the sidepanel with the action button in chromium:
if (USE_SIDE_PANEL) {
  // @ts-expect-error missing types
  browser.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error: unknown) => console.error(error));
}

browser.runtime.onInstalled.addListener((): void => {
  // eslint-disable-next-line no-console
  console.log("Extension installed");
});

let previousTabId = 0;

// communication example: send previous tab title from background page
// see shim.d.ts for type declaration
browser.tabs.onActivated.addListener(async ({ tabId }) => {
  if (!previousTabId) {
    previousTabId = tabId;
    return;
  }

  let tab: Tabs.Tab;

  try {
    tab = await browser.tabs.get(previousTabId);
    previousTabId = tabId;
  } catch {
    return;
  }

  // eslint-disable-next-line no-console
  console.log("previous tab", tab);
  sendMessage(
    "tab-prev",
    { title: tab.title },
    { context: "content-script", tabId }
  );
});

onMessage("get-current-tab", async () => {
  try {
    const tab = await browser.tabs.get(previousTabId);
    return {
      title: tab?.title,
    };
  } catch {
    return {
      title: undefined,
    };
  }
});

onMessage("just-cors", async (message) => {
  const { data } = message;
  const response = await fetch(data.url, {
    mode: "no-cors",
    ...data.init,
  });
  if (data.returnType === "base64") {
    const blob = await response.blob();
    const b64string = await blobToBase64(blob);
    return { data: b64string };
  } else {
    return { data: await response.text() };
  }
});
