const fs = require("node:fs/promises");
const path = require("node:path");
const { sequelize, ProductImage } = require("../src/models");
const storage = require("../src/config/storage");

async function run() {
  try {
    const remove = process.argv.includes("--delete");
    if (process.argv.slice(2).some(arg => arg !== "--delete")) throw new Error("Invalid option");
    await sequelize.authenticate();
    const entries = await fs.readdir(storage.productImages, { withFileTypes: true }).catch(error => { if (error.code === "ENOENT") return []; throw error; });
    let count = 0;
    for (const entry of entries) {
      if (!entry.isFile() || !storage.imageFilename.test(entry.name)) continue;
      const file = path.join(storage.productImages, entry.name);
      const stat = await fs.stat(file);
      if (stat.mtimeMs > Date.now() - 86400000 || await ProductImage.count({ where: { file_path: "/uploads/products/" + entry.name } })) continue;
      count++;
      if (remove) await fs.unlink(file);
    }
    console.log(`${remove ? "Removed" : "Eligible orphan files (dry run)"}: ${count}. Only unreferenced managed images older than 24 hours are eligible.`);
  } catch { console.error("Image cleanup failed. Check database access and file permissions."); process.exitCode = 1; }
  finally { await sequelize.close(); }
}
run();
