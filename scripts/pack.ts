import fs from "fs-extra";
import { r, log } from "./utils";
import archiver from "archiver";
import pkg from "../package.json";

const outputDir = r(".release");
const outputFilePath = r(outputDir, `${pkg.name}-v${pkg.version}.zip`);

// Remove all files except .gitkeep
fs.existsSync(outputDir) || fs.mkdirSync(outputDir);
fs.readdirSync(outputDir).forEach((file) => {
  fs.removeSync(r(outputDir, file));
});
const output = fs
  // Create a writable stream for the zip file
  .createWriteStream(outputFilePath)
  // Listen for all archive data to be written
  .on("close", () => {
    log("Info", `${archive.pointer()} total bytes`);
    log("Info", `Archive finalized and written to ${outputFilePath}`);
  });

// Create a new archiver instance
const archive = archiver("zip", {
  zlib: { level: 9 },
})
  .on("warning", (err) => {
    if (err.code === "ENOENT") {
      log("Warn", err.message);
    } else {
      throw err;
    }
  })
  .on("error", (err) => {
    log("Error", `Archiver error: ${err.message}`);
    throw err;
  })
  .directory("extension/", false);

// Pipe archive data to the file
archive.pipe(output);

// Finalize the archive
archive.finalize();
