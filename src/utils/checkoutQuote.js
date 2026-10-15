const { createHash, createHmac, timingSafeEqual } = require("node:crypto");
const settings = require("../config/settings");
const ShoppingError = require("./ShoppingError");

const TTL_MS = 15 * 60 * 1000;
const fingerprint = data => createHash("sha256").update(JSON.stringify(data)).digest("hex");
const signature = payload => createHmac("sha256", settings.sessionSecret).update("shopnow-checkout-v1:" + payload).digest();

function create(data) {
  const payload = Buffer.from(JSON.stringify({ ...data, expiresAt: Date.now() + TTL_MS })).toString("base64url");
  return payload + "." + signature(payload).toString("base64url");
}

function read(token) {
  const invalid = () => new ShoppingError("Your order review is invalid. Open checkout and review it again.", 409);
  if (typeof token !== "string" || token.length > 2000 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(token)) throw invalid();
  const [payload, encoded] = token.split(".");
  const received = Buffer.from(encoded, "base64url"), expected = signature(payload);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw invalid();
  let data;
  try { data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); } catch { throw invalid(); }
  if (!data || !Number.isSafeInteger(data.expiresAt) || typeof data.hash !== "string") throw invalid();
  return data;
}

module.exports = { fingerprint, create, read };
