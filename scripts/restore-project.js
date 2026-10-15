const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const r = require("./lib/recovery");

async function main() {
  const [source, option, target, ...extra] = process.argv.slice(2);
  if (!source || option !== "--database" || !target || extra.length
      || !/^[a-z][a-z0-9_]{0,62}$/.test(target)) {
    throw r.problem("Usage: npm.cmd run restore -- BACKUP_FOLDER --database new_database_name (lowercase letters, digits, underscores).");
  }
  if (target === r.settings.database.database || ["postgres", "template0", "template1"].includes(target)) throw r.problem("Choose a new database name, different from the active database.");
  const backup = path.resolve(source);
  const manifest = await r.loadManifest(backup);
  await r.runPgTool("pg_restore", ["--version"]);
  await r.runPgTool("pg_restore", ["--list", path.join(backup, "database.dump")]);
  const admin = r.connection("postgres");
  let staging, created = false, restored;
  try {
    await admin.connect();
    if ((await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [target])).rowCount) throw r.problem("That database already exists. Choose a fresh name; existing databases are never overwritten.");
    const folder = path.join(r.root, "recovery");
    await r.privateFolder(folder);
    const id = target + "-" + randomUUID();
    staging = path.join(folder, ".partial-" + id);
    const images = path.join(staging, "uploads/products");
    await fs.mkdir(images, { recursive: true, mode: 0o700 });
    const stagedDump = path.join(staging, "database.dump");
    await r.copyChecked(path.join(backup, "database.dump"), stagedDump, manifest.databaseDump);
    for (const image of manifest.images) await r.copyChecked(path.join(backup, "images", image.file), path.join(images, image.file), image);
    // The identifier is restricted above; data queries remain parameterized.
    await admin.query('CREATE DATABASE "' + target + '" TEMPLATE template0');
    created = true;
    console.log("Restoring into the new database: " + target);
    await r.runPgTool("pg_restore", ["--no-owner", "--no-acl", "--no-password", "--single-transaction", "--exit-on-error", "--dbname=" + target, stagedDump], target);
    restored = r.connection(target);
    await restored.connect();
    const actualImages = await r.managedImages(restored);
    const expectedImages = manifest.images.map(image => image.file).sort();
    if (JSON.stringify(actualImages) !== JSON.stringify(expectedImages)) throw r.problem("Restored image references do not match the backup manifest.");
    await restored.query("BEGIN");
    try {
      // Session deletion cascades only guest carts; customer carts are retained.
      await restored.query("DELETE FROM app_sessions");
      await restored.query("DELETE FROM password_reset_tokens");
      await restored.query("DELETE FROM mail_outbox");
      await restored.query("COMMIT");
    } catch (error) { await restored.query("ROLLBACK"); throw error; }
    await fs.unlink(stagedDump);
    await fs.writeFile(path.join(staging, "restore-info.json"), JSON.stringify({
      database: target, restoredAt: new Date().toISOString(), images: manifest.images.length,
      cleared: ["sessions and guest carts", "password reset tokens", "notification outbox"],
      productImages: "uploads/products"
    }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    const completed = path.join(folder, id);
    await fs.rename(staging, completed);
    staging = null;
    console.log("Recovery complete. Database: " + target);
    console.log("Recovered images: " + path.relative(r.root, path.join(completed, "uploads/products")));
    console.log("Sign-in sessions, reset links and old notification jobs were cleared in the recovered database.");
    console.log("Review docs/BACKUP_RESTORE.md before switching the application to this recovered copy.");
  } catch (error) {
    if (created) console.error("The new recovery database was kept for inspection. Recovery is incomplete; do not switch the app to it yet.");
    throw error;
  } finally {
    if (restored) await restored.end().catch(() => {});
    await admin.end().catch(() => {});
    if (staging) await fs.rm(staging, { recursive: true, force: true });
  }
}

main().catch(error => { console.error("Restore failed: " + r.safeMessage(error)); process.exitCode = 1; });
