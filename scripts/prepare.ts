// generate stub index.html files for dev entry
import chokidar from "chokidar";
import { isDev, r } from "./utils";
import { execSync } from "node:child_process";

async function buildManifest() {
  execSync("pnpm dlx esno ./scripts/manifest.ts", { stdio: "inherit" });
}

void buildManifest();

if (isDev) {
  chokidar
    .watch([r("scripts/manifest.ts"), r("scripts/i18n.ts"), r("package.json")])
    .on("change", () => {
      void buildManifest();
    });
}
