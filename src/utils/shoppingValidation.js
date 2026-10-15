const { isProductId } = require("./catalogueQuery");
const ShoppingError = require("./ShoppingError");

const MAX_CART_LINES = 50;
const MAX_QUANTITY = 99;
const MAX_WISHLIST_ITEMS = 100;

function productId(value) {
  if (typeof value === "number" && Number.isSafeInteger(value)) value = String(value);
  if (!isProductId(value)) throw new ShoppingError("Choose a valid product.");
  return value;
}

function quantity(value, defaultValue) {
  if (value === undefined && defaultValue !== undefined) return defaultValue;
  if ((typeof value !== "number" && typeof value !== "string")
      || !/^\d{1,2}$/.test(String(value).trim())) {
    throw new ShoppingError(`Quantity must be a whole number between 1 and ${MAX_QUANTITY}.`);
  }
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > MAX_QUANTITY) {
    throw new ShoppingError(`Quantity must be a whole number between 1 and ${MAX_QUANTITY}.`);
  }
  return number;
}

function requestOwner(req) {
  return req.currentUser
    ? { userId: req.currentUser.id, authVersion: req.session.authVersion }
    : { sessionId: req.sessionID };
}

function shoppingReturn(value, fallback = "/cart") {
  if (typeof value !== "string" || value.length > 600 || !value.startsWith("/")
      || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/u.test(value)) return fallback;
  const url = new URL(value, "https://shopnow.invalid");
  if (url.origin !== "https://shopnow.invalid"
      || !/^\/(?:products(?:\/[1-9]\d*)?|cart|wishlist|account)?$/.test(url.pathname)) return fallback;
  return url.pathname + url.search;
}

function withNotice(url, notice) {
  const target = new URL(url, "https://shopnow.invalid");
  target.searchParams.set("notice", notice);
  return target.pathname + target.search;
}

module.exports = { MAX_CART_LINES, MAX_QUANTITY, MAX_WISHLIST_ITEMS, productId, quantity, requestOwner, shoppingReturn, withNotice };
