const fs = require("node:fs/promises");
const path = require("node:path");
const { spawn } = require("node:child_process");
const r = require("./lib/recovery");

function run(script, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(r.root, "scripts", script), ...args], {
      cwd: r.root, shell: false, windowsHide: true, stdio: "inherit"
    });
    child.once("error", () => reject(r.problem("Could not start the verification command.")));
    child.once("close", code => code === 0 ? resolve() : reject(r.problem("Verification stopped. Fix the failed check above, then retry.")));
  });
}

async function main() {
  if (process.argv.length > 3) throw r.problem("Usage: npm.cmd run verify -- http://localhost:3000");
  console.log("1/3 Source and EJS checks");
  await run("cleanup-api-reference.js", ["--check"]);
  await run("check-source.js");
  console.log("2/3 Configuration, migrations and referenced images");
  if (Buffer.byteLength(r.settings.sessionSecret, "utf8") < 32) throw r.problem("SESSION_SECRET needs at least 32 bytes. Run npm.cmd run auth:setup.");
  const client = r.connection();
  try {
    await client.connect();
    const expected = (await fs.readdir(path.join(r.root, "src/migrations"))).filter(name => name.endsWith(".js"));
    let actual;
    try { actual = new Set((await client.query('SELECT name FROM "SequelizeMeta"')).rows.map(row => row.name)); }
    catch (error) { if (error.code === "42P01") throw r.problem("Database migrations are missing. Run npm.cmd run db:migrate."); throw error; }
    if (expected.some(name => !actual.has(name))) throw r.problem("Pending migrations found. Run npm.cmd run db:migrate before verification.");
    const required = ["users", "addresses", "password_reset_tokens", "categories", "products", "product_images", "carts", "cart_items", "wishlists", "coupons", "orders", "order_items", "order_addresses", "payments", "coupon_redemptions", "app_sessions", "mail_outbox"];
    const tables = new Set((await client.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'")).rows.map(row => row.tablename));
    if (required.some(table => !tables.has(table))) throw r.problem("A required application table is missing. Review the migration history.");
    const images = await r.managedImages(client);
    for (const name of images) await r.fileInfo(path.join(r.storage.productImages, name));
    const admins = (await client.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin'")).rows[0].count;
    console.log("PASS migrations: " + expected.length + "; application tables: " + required.length + "; uploaded images: " + images.length + ".");
    console.log("Admin accounts: " + admins + (admins ? "." : ". Register and promote your own account for the admin demo."));
  } finally { await client.end().catch(() => {}); }
  console.log("3/3 Running application smoke checks");
  await run("smoke-check.js", process.argv[2] ? [process.argv[2]] : []);
  console.log("Verification passed. Complete the customer/admin acceptance checklist in docs/FINAL_SUBMISSION.md.");
}

main().catch(error => { console.error("Verification failed: " + r.safeMessage(error)); process.exitCode = 1; });
