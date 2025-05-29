import { onMessage } from "webext-bridge/background";
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

// 在Service Worker调用fetch，解决跨域问题
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
