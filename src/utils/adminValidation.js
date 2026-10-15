const { createHash } = require("node:crypto");
const validator = require("validator");
const { id } = require("./checkoutValidation");
const { toMinorUnits, toDecimal } = require("./money");
const ShoppingError = require("./ShoppingError");

const MAX_STOCK = 2147483647;
const LOW_STOCK = 5;
const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];
const PAYMENT_STATUSES = ["unpaid", "paid", "failed"];
const FIELDS = {
  category: ["name", "slug", "is_active"],
  product: ["category_id", "sku", "name", "description", "price", "is_active"],
  coupon: ["code", "discount_type", "discount_value", "min_order_amount", "expires_at", "global_usage_limit", "per_user_usage_limit", "is_active"]
};

function text(value, label, maximum, optional = false, multiline = false) {
  if (value === undefined && optional) return "";
  if (typeof value !== "string") throw new ShoppingError(`${label} must be text.`);
  const clean = value.trim();
  if ((!optional && !clean) || clean.length > maximum || (multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u : /[\u0000-\u001f\u007f]/u).test(clean)) {
    throw new ShoppingError(`${label} must contain ${optional ? "0" : "1"} to ${maximum} valid characters.`);
  }
  return clean;
}

function active(value) {
  if (value === undefined) return true;
  if ([true, "1", "true"].includes(value)) return true;
  if ([false, "0", "false"].includes(value)) return false;
  throw new ShoppingError("Choose an active or inactive status.");
}

function money(value, label, positive = false) {
  if (typeof value === "number" && Number.isFinite(value)) value = String(value);
  if (typeof value !== "string" || !/^\d{1,10}(?:\.\d{1,2})?$/.test(value.trim())) throw new ShoppingError(`${label} must be a nonnegative amount with at most two decimal places.`);
  const amount = toMinorUnits(value.trim());
  if (positive && amount < 1n) throw new ShoppingError(`${label} must be at least 0.01.`);
  return toDecimal(amount);
}

function integer(value, label, minimum = 0, optional = false) {
  if (optional && [undefined, "", null].includes(value)) return null;
  if ((typeof value !== "string" && typeof value !== "number") || !/^\d{1,10}$/.test(String(value).trim())) throw new ShoppingError(`${label} must be a whole number.`);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum || number > MAX_STOCK) throw new ShoppingError(`${label} must be between ${minimum} and ${MAX_STOCK}.`);
  return number;
}

function categoryInput(body = {}) {
  const name = text(body.name, "Category name", 100);
  const slug = text(body.slug, "Category slug", 120);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new ShoppingError("Slug must use lowercase letters, numbers and single hyphens, for example home-kitchen.");
  return { name, slug, is_active: active(body.is_active) };
}

function productInput(body = {}, creating = false) {
  const sku = text(body.sku, "SKU", 60).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._-]{0,59}$/.test(sku)) throw new ShoppingError("SKU must use letters, numbers, dots, underscores or hyphens.");
  return {
    category_id: id(body.category_id, "category"), sku, name: text(body.name, "Product name", 150),
    description: text(body.description, "Description", 5000, false, true), price: money(body.price, "Price"), is_active: active(body.is_active),
    ...(creating ? { stock_quantity: integer(body.stock_quantity, "Initial stock") } : {})
  };
}

function expiry(value) {
  if ([undefined, "", null].includes(value)) return null;
  if (typeof value !== "string" || value.length > 35) throw new ShoppingError("Enter a valid expiry date and time in UTC.");
  let normalized = value.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) normalized += ":00Z";
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(normalized)
      || !validator.isISO8601(normalized, { strict: true, strictSeparator: true }) || !Number.isFinite(Date.parse(normalized))) throw new ShoppingError("Enter a valid expiry date and time in UTC.");
  return new Date(normalized);
}

function couponInput(body = {}) {
  const code = text(body.code, "Coupon code", 50).toUpperCase();
  if (!/^[A-Z0-9_-]{1,50}$/.test(code)) throw new ShoppingError("Coupon code must use letters, numbers, hyphens or underscores.");
  if (!["fixed", "percentage"].includes(body.discount_type)) throw new ShoppingError("Choose a fixed or percentage discount.");
  const value = money(body.discount_value, "Discount value", true);
  if (body.discount_type === "percentage" && toMinorUnits(value) > 10000n) throw new ShoppingError("Percentage discount cannot exceed 100.");
  return {
    code, discount_type: body.discount_type, discount_value: value, min_order_amount: money(body.min_order_amount === undefined ? "0.00" : body.min_order_amount, "Minimum subtotal"),
    expires_at: expiry(body.expires_at), global_usage_limit: integer(body.global_usage_limit, "Global usage limit", 1, true),
    per_user_usage_limit: integer(body.per_user_usage_limit, "Per-customer usage limit", 1, true), is_active: active(body.is_active)
  };
}

function revision(kind, row) {
  return createHash("sha256").update(JSON.stringify(FIELDS[kind].map(field => {
    const value = row[field];
    return value instanceof Date ? value.toISOString() : value === null ? null : String(value);
  }))).digest("hex");
}

function checkRevision(kind, row, supplied) {
  if (typeof supplied !== "string" || !/^[a-f0-9]{64}$/.test(supplied)) throw new ShoppingError("Reload the edit page before saving.", 409);
  if (supplied !== revision(kind, row)) throw new ShoppingError("Another update changed this record. Reload the edit page and apply your changes again.", 409);
}

function filters(query = {}, resource = "products") {
  const page = query.page === undefined ? 1 : integer(query.page, "Page", 1);
  if (page > 1000000) throw new ShoppingError("Page must not exceed 1000000.");
  const selected = { q: text(query.q, "Search", 100, true), page };
  if (resource === "orders") {
    selected.status = text(query.status, "Order status", 20, true);
    selected.payment = text(query.payment, "Payment status", 20, true);
    if (selected.status && !ORDER_STATUSES.includes(selected.status)) throw new ShoppingError("Choose a valid order status.");
    if (selected.payment && !PAYMENT_STATUSES.includes(selected.payment)) throw new ShoppingError("Choose a valid payment status.");
  } else {
    selected.state = text(query.state, "Availability", 10, true) || "all";
    if (!["all", "active", "inactive"].includes(selected.state)) throw new ShoppingError("Choose a valid availability filter.");
    if (resource === "products" || resource === "inventory") {
      selected.category = query.category ? id(query.category, "category") : "";
      selected.low = text(query.low, "Low stock filter", 1, true);
      if (selected.low && selected.low !== "1") throw new ShoppingError("Choose a valid low stock filter.");
    }
  }
  return selected;
}

function pageUrl(path, selected, page) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...selected, page })) if (value && !(key === "state" && value === "all") && !(key === "page" && value === 1)) params.set(key, String(value));
  return path + (params.size ? "?" + params : "");
}

module.exports = { MAX_STOCK, LOW_STOCK, ORDER_STATUSES, PAYMENT_STATUSES, text, integer, categoryInput, productInput, couponInput, revision, checkRevision, filters, pageUrl };
