const { generateToken } = require("../middleware/csrf");
const { COOKIE_NAME, cookieOptions } = require("../config/session");
const { mergeGuestCart } = require("../services/cartService");

async function signIn(req, user) {
  const merge = await mergeGuestCart(req.sessionID, user);
  // Replace the anonymous ID so a pre-login session cannot become an authenticated session.
  await new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
  req.session.userId = String(user.id);
  req.session.authVersion = user.auth_version;
  generateToken(req, true);
  await new Promise((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
  return merge;
}

async function signOut(req, res) {
  await new Promise((resolve, reject) => req.session.destroy(error => error ? reject(error) : resolve()));
  res.clearCookie(COOKIE_NAME, cookieOptions);
}

function isApiRequest(req) {
  return req.originalUrl.split("?")[0].startsWith("/api/");
}

module.exports = { signIn, signOut, isApiRequest };
