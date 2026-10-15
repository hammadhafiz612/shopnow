const assert = require("node:assert/strict");
const settings = require("../src/config/settings");

async function main() {
  const base = new URL(process.argv[2] || settings.appUrl);
  assert.ok(["http:", "https:"].includes(base.protocol) && !base.username && !base.password
    && base.pathname === "/" && !base.search && !base.hash,
  "Use an HTTP/HTTPS application origin, for example http://localhost:3000.");

  async function get(path, status = 200, json = true) {
    const response = await fetch(new URL(path, base), { redirect: "manual", signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, status, path + " returned HTTP " + response.status);
    const body = json ? await response.json() : await response.text();
    console.log("PASS GET " + path + " (" + status + ")");
    return { response, body };
  }

  const health = await get("/api/health");
  assert.equal(health.body.database, "connected");
  assert.equal(health.response.headers.get("cache-control"), "no-store");
  await get("/", 200, false);
  await get("/products", 200, false);
  const catalogue = await get("/api/products");
  assert.ok(Array.isArray(catalogue.body.products), "Expected a product list.");
  if (catalogue.body.products.length) await get("/api/products/" + catalogue.body.products[0].id);
  else console.log("INFO No active products. Seed or create a product before the customer demo.");
  await get("/api/products?sort=invalid", 400);
  await get("/api/products/not-an-id", 404);
  const cart = (await get("/api/cart")).body.cart;
  assert.equal(cart.currency, "PKR");
  assert.equal(cart.discountAmount, "0.00");
  assert.equal(cart.totalAmount, cart.subtotal);
  const csrf = await get("/api/auth/csrf");
  assert.match(csrf.body.csrfToken, /^[a-f0-9]{64}$/);
  assert.match(csrf.response.headers.get("set-cookie") || "", /HttpOnly/i);
  assert.match(csrf.response.headers.get("set-cookie") || "", /SameSite=Lax/i);
  await get("/api/orders", 401);
  await get("/api/admin/summary", 401);
  await get("/api/no-such-endpoint", 404);
  await get("/no-such-page", 404, false);
  console.log("Smoke check passed. Customer/admin checkout, uploads and email delivery need the demo checklist.");
}

main().catch(error => {
  console.error("Smoke check failed: " + error.message);
  console.error("Start the server and check the URL, database and migrations, then retry.");
  process.exitCode = 1;
});
