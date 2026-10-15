const fs = require("node:fs/promises");
const { createReadStream, constants } = require("node:fs");
const path = require("node:path");
const net = require("node:net");
const { createHash } = require("node:crypto");
const { spawn } = require("node:child_process");
const { Client } = require("pg");
const settings = require("../../src/config/settings");
const storage = require("../../src/config/storage");

const root = path.resolve(__dirname, "../..");

function problem(message) {
  const error = new Error(message);
  error.safeMessage = message;
  return error;
}

function safeMessage(error) {
  if (error.safeMessage) return error.safeMessage;
  if (["28P01", "28000"].includes(error.code)) return "Database authentication failed. Check DB_USER and DB_PASSWORD.";
  if (error.code === "3D000") return "Database not found. Check DB_NAME and the PostgreSQL service.";
  if (error.code === "42501") return "The database account needs permission for this operation.";
  if (["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND"].includes(error.code)) return "PostgreSQL is unavailable. Check the service, host and port.";
  if (["EACCES", "EPERM", "ENOSPC"].includes(error.code)) return "Check local folder permissions and available disk space.";
  if (error.code === "ENOENT") return "A required local file or folder is missing. Check the backup path and uploaded product images.";
  return "Operation failed. Check the database, local files and the setup guide. No credentials were printed.";
}

function connection(database = settings.database.database) {
  return new Client({
    host: settings.database.host, port: settings.database.port, database,
    user: settings.database.username, password: settings.database.password,
    connectionTimeoutMillis: 5000, application_name: "shopnow-maintenance"
  });
}

async function privateFolder(folder) {
  await fs.mkdir(folder, { recursive: true, mode: 0o700 });
  const info = await fs.lstat(folder);
  if (!info.isDirectory() || info.isSymbolicLink()) throw problem("Backup/recovery folders must be real directories, not links.");
}

async function fileInfo(file) {
  const before = await fs.lstat(file);
  if (!before.isFile() || before.isSymbolicLink() || before.size < 1) throw problem("A required backup or image file is invalid.");
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  const after = await fs.lstat(file);
  if (before.size !== after.size || before.mtimeMs !== after.mtimeMs) throw problem("A file changed while it was being checked. Stop ShopNow and retry.");
  return { size: after.size, sha256: hash.digest("hex") };
}

async function copyChecked(source, destination, expected) {
  const actual = await fileInfo(source);
  if (actual.size !== expected.size || actual.sha256 !== expected.sha256) throw problem("Backup checksum mismatch. Use an intact backup.");
  await fs.copyFile(source, destination, constants.COPYFILE_EXCL);
  const copied = await fileInfo(destination);
  if (copied.size !== expected.size || copied.sha256 !== expected.sha256) throw problem("A copied file failed its checksum check.");
  await fs.chmod(destination, 0o600);
}

async function managedImages(client) {
  const { rows } = await client.query("SELECT file_path FROM product_images WHERE file_path LIKE '/uploads/products/%'");
  const prefix = "/uploads/products/";
  const names = rows.map(row => row.file_path.slice(prefix.length));
  if (names.some(name => !storage.imageFilename.test(name))) throw problem("A product image has an invalid managed path. Review product_images before continuing.");
  return [...new Set(names)].sort();
}

async function requireStoppedServer() {
  const running = await new Promise(resolve => {
    const socket = net.createConnection({ host: "127.0.0.1", port: settings.port });
    let finished = false;
    const finish = value => { if (!finished) { finished = true; socket.destroy(); resolve(value); } };
    socket.setTimeout(1000, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
  if (running) throw problem("Stop the ShopNow server with Ctrl+C before making a database-and-images backup.");
}

function runPgTool(name, args, database = settings.database.database) {
  const filename = name + (process.platform === "win32" ? ".exe" : "");
  const executable = process.env.PG_BIN_DIR ? path.join(path.resolve(process.env.PG_BIN_DIR), filename) : filename;
  // Inherited PGHOSTADDR/PGSERVICE must not redirect a backup away from .env.
  const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^PG[A-Z0-9_]*$/i.test(key)));
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      shell: false, windowsHide: true, stdio: ["ignore", "ignore", "pipe"],
      env: { ...environment, PGHOST: settings.database.host, PGPORT: String(settings.database.port),
        PGUSER: settings.database.username, PGPASSWORD: settings.database.password,
        PGDATABASE: database, PGCONNECT_TIMEOUT: "5", PGAPPNAME: "shopnow-maintenance" }
    });
    let diagnostic = "", timedOut = false;
    child.stderr.on("data", data => { diagnostic = (diagnostic + data.toString()).slice(-8192); });
    const timeout = setTimeout(() => { timedOut = true; child.kill(); }, 5 * 60 * 1000);
    child.once("error", error => {
      clearTimeout(timeout);
      reject(error.code === "ENOENT" ? problem("Cannot find " + name + ". Set PG_BIN_DIR to your PostgreSQL bin folder or add it to PATH.") : problem("Could not start " + name + ". Check PG_BIN_DIR and permissions."));
    });
    child.once("close", code => {
      clearTimeout(timeout);
      if (code === 0) return resolve();
      if (timedOut) return reject(problem(name + " exceeded five minutes. Check the database/tool before retrying."));
      if (/version mismatch|unsupported version/i.test(diagnostic)) return reject(problem("PostgreSQL tool version mismatch. Use matching tools, or pg_dump at least as new as the source server."));
      if (/password authentication failed/i.test(diagnostic)) return reject(problem("PostgreSQL authentication failed. Check the existing database credentials."));
      reject(problem(name + " failed. Check database permissions, tool version and disk space."));
    });
  });
}

async function loadManifest(folder) {
  const directory = await fs.lstat(folder);
  if (!directory.isDirectory() || directory.isSymbolicLink()) throw problem("Choose a real backup folder.");
  const manifestFile = path.join(folder, "manifest.json");
  const info = await fs.lstat(manifestFile);
  if (!info.isFile() || info.isSymbolicLink() || info.size > 10 * 1024 * 1024) throw problem("Invalid backup manifest.");
  let manifest;
  try { manifest = JSON.parse(await fs.readFile(manifestFile, "utf8")); } catch { throw problem("Invalid backup manifest JSON."); }
  const validInfo = value => value && Number.isSafeInteger(value.size) && value.size > 0
    && typeof value.sha256 === "string" && /^[a-f0-9]{64}$/.test(value.sha256);
  if (!manifest || manifest.format !== "shopnow-backup" || manifest.version !== 1
      || !validInfo(manifest.databaseDump) || manifest.databaseDump.file !== "database.dump"
      || !Array.isArray(manifest.images) || manifest.images.length > 50000) throw problem("Unsupported or incomplete backup manifest.");
  const names = new Set();
  for (const image of manifest.images) {
    if (!validInfo(image) || typeof image.file !== "string" || !storage.imageFilename.test(image.file) || names.has(image.file)) throw problem("Invalid or duplicate image entry in the backup manifest.");
    names.add(image.file);
  }
  const dump = await fileInfo(path.join(folder, "database.dump"));
  if (dump.size !== manifest.databaseDump.size || dump.sha256 !== manifest.databaseDump.sha256) throw problem("Database backup checksum mismatch. Use an intact backup.");
  const handle = await fs.open(path.join(folder, "database.dump"), "r");
  try {
    const signature = Buffer.alloc(5);
    await handle.read(signature, 0, 5, 0);
    if (signature.toString() !== "PGDMP") throw problem("The backup is not a PostgreSQL custom-format dump.");
  } finally { await handle.close(); }
  if (manifest.images.length) {
    const imageFolder = await fs.lstat(path.join(folder, "images"));
    if (!imageFolder.isDirectory() || imageFolder.isSymbolicLink()) throw problem("Invalid backup image folder.");
  }
  for (const image of manifest.images) {
    const actual = await fileInfo(path.join(folder, "images", image.file));
    if (actual.size !== image.size || actual.sha256 !== image.sha256) throw problem("Image backup checksum mismatch. Use an intact backup.");
  }
  return manifest;
}

module.exports = { root, settings, storage, problem, safeMessage, connection, privateFolder,
  fileInfo, copyChecked, managedImages, requireStoppedServer, runPgTool, loadManifest };
