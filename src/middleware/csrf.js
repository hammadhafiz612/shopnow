const { csrfSync } = require("csrf-sync");

const { generateToken, csrfSynchronisedProtection } = csrfSync({
  size: 32,
  getTokenFromRequest(req) {
    // HTML forms (including bounded multipart uploads) use _csrf; JSON clients
    // can send X-CSRF-Token. Never read a submitted token from the session cookie.
    const token = req.get("X-CSRF-Token") || (req.body && req.body._csrf);
    return typeof token === "string" && /^[a-f0-9]{64}$/.test(token) ? token : undefined;
  }
});

function exposeCsrf(req, res, next) {
  res.set("Cache-Control", "no-store");
  res.locals.csrfToken = generateToken(req);
  next();
}

function verifyCsrf(req, res, next) {
  res.set("Cache-Control", "no-store");
  csrfSynchronisedProtection(req, res, next);
}

module.exports = { exposeCsrf, verifyCsrf, generateToken };
