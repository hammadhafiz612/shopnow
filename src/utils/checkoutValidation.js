const validator = require("validator");
const { isProductId } = require("./catalogueQuery");
const ShoppingError = require("./ShoppingError");

const ADDRESS_FIELDS = ["recipient_name", "phone", "line1", "line2", "city", "state", "postal_code", "country_code"];

function id(value, label = "record") {
  if (typeof value === "number" && Number.isSafeInteger(value)) value = String(value);
  if (!isProductId(value)) throw new ShoppingError(`Choose a valid ${label}.`);
  return value;
}

function uuid(value) {
  if (typeof value !== "string" || !validator.isUUID(value, "4")) {
    throw new ShoppingError("The confirmation key is invalid. Refresh the page and try again.");
  }
  return value.toLowerCase();
}

function couponCode(value) {
  if (value === undefined || value === "") return "";
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,50}$/.test(value.trim())) {
    throw new ShoppingError("Enter a coupon with at most 50 letters, numbers, hyphens or underscores.");
  }
  return value.trim().toUpperCase();
}

function addressInput(body = {}) {
  const limits = { label: 50, recipient_name: 100, phone: 30, line1: 200, line2: 200, city: 100, state: 100, postal_code: 20, country_code: 2 };
  const required = new Set(["recipient_name", "phone", "line1", "city", "country_code"]);
  const labels = { recipient_name: "Recipient name", line1: "Address line 1", line2: "Address line 2", postal_code: "Postal code", country_code: "Country code" };
  const values = {}, errors = [];
  for (const [field, maximum] of Object.entries(limits)) {
    const raw = body[field];
    const value = raw === undefined ? "" : typeof raw === "string" ? raw.trim() : null;
    const label = labels[field] || field[0].toUpperCase() + field.slice(1);
    if (value === null || (value && (value.length > maximum || /[\u0000-\u001f\u007f]/u.test(value))) || (required.has(field) && !value)) {
      errors.push(`${label} must contain ${required.has(field) ? "1" : "0"} to ${maximum} characters.`);
    }
    values[field] = value === null ? "" : value.slice(0, maximum);
  }
  values.country_code = values.country_code.toUpperCase();
  if (!validator.isISO31661Alpha2(values.country_code)) errors.push("Enter a valid two-letter country code, for example PK.");
  if (!/^[+\d ()-]{7,30}$/.test(values.phone) || values.phone.replace(/\D/g, "").length < 7) errors.push("Enter a valid phone number with at least 7 digits.");
  const defaultValue = body.is_default;
  if (![undefined, false, true, "0", "1", "on"].includes(defaultValue)) errors.push("Choose a valid default address option.");
  values.is_default = [true, "1", "on"].includes(defaultValue);
  return { values, errors };
}

function checkoutNext(value) { return value === "checkout" ? "checkout" : "addresses"; }

module.exports = { ADDRESS_FIELDS, id, uuid, couponCode, addressInput, checkoutNext };
