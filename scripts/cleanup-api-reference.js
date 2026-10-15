const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const obsoleteFiles = [
  "docs/API_GUIDE.md",
  "docs/openapi.json",
  "scripts/check-api-docs.js",
  "src/controllers/documentationController.js",
  "src/views/api/docs.ejs"
];

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== "--check")) {
  console.error("Usage: node scripts/cleanup-api-reference.js [--check]");
  process.exit(1);
}
const checkOnly = args[0] === "--check";
let removed = 0, found = 0;
for (const relativePath of obsoleteFiles) {
  const file = path.join(root, relativePath);
  try {
    if (!fs.existsSync(file)) continue;
    found += 1;
    if (checkOnly) continue;
    // Delete only the retired files, never directories or other project data.
    fs.rmSync(file);
    removed += 1;
    console.log("Removed: " + relativePath);
  } catch (error) {
    console.error("Could not remove " + relativePath + " (" + error.code + ").");
    process.exitCode = 1;
  }
}

if (checkOnly && found) {
  console.error("Retired API reference files remain. Run node scripts/cleanup-api-reference.js, then retry verification.");
  process.exitCode = 1;
} else if (!process.exitCode) {
  console.log(checkOnly ? "Retired-file check passed." : "API reference cleanup complete. Files removed: " + removed + ".");
}
