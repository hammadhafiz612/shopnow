const Joi = require("joi");
const validator = require("validator");

// Keep existing accepted email formats while Joi handles type, presence and length.
const email = Joi.string().max(254).custom((value, helpers) =>
  validator.isEmail(value) ? value : helpers.error("string.email")
).required().messages({ "*": "Enter a valid email address." });

const fullName = Joi.string().max(100).pattern(/^[^\u0000-\u001f\u007f]+$/u).required()
  .messages({ "*": "Enter a name between 1 and 100 characters." });

const password = Joi.string().custom((value, helpers) => {
  if (Array.from(value).length < 12) return helpers.error("password.short");
  if (Buffer.byteLength(value, "utf8") > 72) return helpers.error("password.long");
  if (/[\u0000-\u001f\u007f]/u.test(value)) return helpers.error("password.control");
  return value;
}).required().messages({
  "password.long": "Your password is too long. Use at most 72 bytes (72 basic English characters).",
  "password.control": "Your password cannot contain control characters.",
  "*": "Use a password with at least 12 characters."
});

const confirmPassword = Joi.string().valid(Joi.ref("password")).required()
  .messages({ "*": "The passwords do not match." });

const loginPassword = Joi.string().custom((value, helpers) =>
  Buffer.byteLength(value, "utf8") <= 72 ? value : helpers.error("password.long")
).required().messages({ "*": "Enter a valid password." });

const options = { abortEarly: false, convert: false };
const passwordConfirmation = Joi.object({ password, confirmPassword }).prefs(options);
const registration = Joi.object({ full_name: fullName, email, password, confirmPassword }).prefs(options);
const login = Joi.object({ email, password: loginPassword }).prefs(options);

// Only return our fixed messages, never Joi's input values or password contexts.
function errorsFor(schema, input) {
  const { error } = schema.validate(input);
  return error ? [...new Set(error.details.map(detail => detail.message))] : [];
}

module.exports = { email, passwordConfirmation, registration, login, errorsFor };
