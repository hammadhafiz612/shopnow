const schemas = require("../validators/authSchemas");

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function validEmail(email) {
  return !schemas.email.validate(email).error;
}

function validatePassword(password, confirmation) {
  return schemas.errorsFor(schemas.passwordConfirmation, { password, confirmPassword: confirmation });
}

function validateRegistration(body = {}) {
  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const email = normalizeEmail(body.email);
  const errors = schemas.errorsFor(schemas.registration, {
    full_name: fullName, email, password: body.password, confirmPassword: body.confirmPassword
  });
  return { values: { full_name: fullName.slice(0, 100), email: email.slice(0, 254) }, errors };
}

function validateLogin(body = {}) {
  const email = normalizeEmail(body.email);
  const errors = schemas.errorsFor(schemas.login, { email, password: body.password });
  return { values: { email: email.slice(0, 254) }, errors };
}

function safeNext(value) {
  if (typeof value !== "string" || value.length > 500 || !value.startsWith("/")
      || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/u.test(value)) return "/account";
  const url = new URL(value, "https://shopnow.invalid");
  if (url.origin !== "https://shopnow.invalid"
      || /^\/(?:login|register|forgot-password|reset-password)(?:\/|$)/.test(url.pathname)) return "/account";
  return url.pathname + url.search;
}

function validResetToken(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

module.exports = { normalizeEmail, validEmail, validatePassword, validateRegistration, validateLogin, safeNext, validResetToken };
