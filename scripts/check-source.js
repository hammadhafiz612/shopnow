const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const ejs = require("ejs");

const root = path.resolve(__dirname, "..");
let failed = false;

function checkFolder(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);

    if (entry.isDirectory()) {
      checkFolder(file);
    } else if (entry.name.endsWith(".js")) {
      const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });

      if (result.status !== 0) {
        failed = true;
        console.error(result.stderr);
      }
    } else if (entry.name.endsWith(".ejs")) {
      try {
        ejs.compile(fs.readFileSync(file, "utf8"), { filename: file });
      } catch (error) {
        failed = true;
        console.error(error.message);
      }
    }
  }
}

checkFolder(path.join(root, "src"));
checkFolder(path.join(root, "scripts"));

if (failed) {
  process.exitCode = 1;
} else {
  console.log("JavaScript syntax and EJS templates passed.");
}
