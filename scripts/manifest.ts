import fs from "fs-extra";
import { log, r, isDev, isFirefox, port } from "./utils";
import type { Manifest } from "webextension-polyfill";
import type PkgType from "../package.json";

async function getManifest() {
  const pkg = (await fs.readJSON(r("package.json"))) as typeof PkgType;

  // update this file to update this manifest.json
  // can also be conditional based on your need
  const manifest: Manifest.WebExtensionManifest = {
    manifest_version: 3,
    name: pkg.displayName || pkg.name,
    author: pkg.author,
    version: pkg.version,
    description: pkg.description,
    action: {
      default_icon: "./assets/simple-icons--mangaupdates.png",
      // default_popup: "./dist/popup/index.html",
    },
    // options_ui: {
    //   page: "./dist/options/index.html",
    //   open_in_tab: true,
    // },
    background: isFirefox
      ? {
          scripts: ["dist/background/index.mjs"],
          type: "module",
        }
      : {
          service_worker: "./dist/background/index.mjs",
        },
    icons: {
      16: "./assets/simple-icons--mangaupdates.png",
      48: "./assets/simple-icons--mangaupdates.png",
      128: "./assets/simple-icons--mangaupdates.png",
      256: "./assets/simple-icons--mangaupdates.png",
    },
    permissions: [
      "tabs",
      "storage",
      "activeTab",
      // "sidePanel",
      "scripting",
    ].concat(isDev ? ["webNavigation"] : []),
    host_permissions: ["*://*/*"],
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["dist/contentScripts/index.global.js"],
      },
    ],
    web_accessible_resources: [
      {
        resources: ["dist/contentScripts/index.css", "assets/loading.png"],
        matches: ["<all_urls>"],
      },
    ],
    content_security_policy: {
      extension_pages: isDev
        ? // this is required on dev for Vite script to load
          `script-src \'self\' http://localhost:${port}; object-src \'self\'`
        : "script-src 'self'; object-src 'self'",
    },
  };

  //#region add sidepanel
  // if (isFirefox) {
  //   manifest.sidebar_action = {
  //     default_panel: "dist/sidepanel/index.html",
  //   };
  // } else {
  //   // the sidebar_action does not work for chromium based
  //   (manifest as any).side_panel = {
  //     default_path: "dist/sidepanel/index.html",
  //   };
  // }
  //#endregion

  return manifest;
}

export async function writeManifest() {
  await fs.writeJSON(r("extension/manifest.json"), await getManifest(), { spaces: 2 });
  log("PRE", "write manifest.json");
}

writeManifest();
