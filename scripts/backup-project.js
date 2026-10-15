const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const r = require("./lib/recovery");

async function main() {
  if (process.argv.length !== 2) throw r.problem("Usage: npm.cmd run backup (stop the server first).");
  await r.requireStoppedServer();
  await r.runPgTool("pg_dump", ["--version"]);
  const client = r.connection();
  let staging;
  try {
    await client.connect();
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const snapshot = (await client.query("SELECT pg_export_snapshot() AS id")).rows[0].id;
    const images = await r.managedImages(client);
    const version = (await client.query("SHOW server_version")).rows[0].server_version;
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const id = stamp + "-" + randomUUID();
    const folder = path.join(r.root, "backups");
    await r.privateFolder(folder);
    staging = path.join(folder, ".partial-" + id);
    await fs.mkdir(staging, { mode: 0o700 });
    await fs.mkdir(path.join(staging, "images"), { mode: 0o700 });
    console.log("Creating PostgreSQL dump and copying referenced product images...");
    await r.runPgTool("pg_dump", ["--format=custom", "--no-owner", "--no-acl", "--no-password", "--snapshot=" + snapshot, "--file=" + path.join(staging, "database.dump")]);
    await client.query("COMMIT");
    await fs.chmod(path.join(staging, "database.dump"), 0o600);
    const records = [];
    for (const name of images) {
      const source = path.join(r.storage.productImages, name);
      const info = await r.fileInfo(source);
      await r.copyChecked(source, path.join(staging, "images", name), info);
      records.push({ file: name, ...info });
    }
    const manifest = {
      format: "shopnow-backup", version: 1, createdAt: new Date().toISOString(),
      projectVersion: require("../package.json").version,
      sourceDatabase: r.settings.database.database, serverVersion: version,
      databaseDump: { file: "database.dump", ...await r.fileInfo(path.join(staging, "database.dump")) },
      images: records
    };
    await fs.writeFile(path.join(staging, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    await r.loadManifest(staging);
    const completed = path.join(folder, "shopnow-" + id);
    await fs.rename(staging, completed);
    staging = null;
    console.log("Backup complete: " + path.relative(r.root, completed));
    console.log("Referenced uploaded images: " + records.length + ". Keep this private backup outside source submissions.");
  } finally {
    await client.end().catch(() => {});
    if (staging) await fs.rm(staging, { recursive: true, force: true });
  }
}

main().catch(error => { console.error("Backup failed: " + r.safeMessage(error)); process.exitCode = 1; });
