const { generateToken } = require("./csrf");
const { User } = require("../models");
const { isApiRequest } = require("../utils/authSession");

async function loadCurrentUser(req, res, next) {
  req.currentUser = null;
  res.locals.currentUser = null;
  res.locals.csrfToken = "";
  if (req.session.userId) {
    const user = await User.findByPk(req.session.userId, {
      attributes: ["id", "full_name", "email", "role", "auth_version"]
    });
    if (user && user.auth_version === req.session.authVersion) {
      req.currentUser = { id: String(user.id), full_name: user.full_name, email: user.email, role: user.role };
      res.locals.currentUser = req.currentUser;
      res.locals.csrfToken = generateToken(req);
      res.set("Cache-Control", "no-store");
    } else {
      // Password reset or role change revokes sessions by changing auth_version.
      delete req.session.userId;
      delete req.session.authVersion;
      delete req.session.csrfToken;
    }
  }
  next();
}

function requireLogin(req, res, next) {
  if (req.currentUser) return next();
  if (isApiRequest(req)) return res.status(401).json({ message: "Please sign in to continue." });
  res.redirect(303, "/login?next=" + encodeURIComponent(req.originalUrl));
}

function guestOnly(req, res, next) {
  if (!req.currentUser) return next();
  if (isApiRequest(req)) return res.status(409).json({ message: "You are already signed in." });
  res.redirect(303, "/account");
}

function requireRole(role) {
  return function (req, res, next) {
    if (!req.currentUser) return requireLogin(req, res, next);
    if (req.currentUser.role === role) return next();
    if (isApiRequest(req)) return res.status(403).json({ message: "You do not have access to this page." });
    res.status(403).render("error", {
      title: "Access denied | ShopNow", status: 403,
      message: "You do not have access to this page.", year: new Date().getFullYear()
    });
  };
}

module.exports = { loadCurrentUser, requireLogin, guestOnly, requireRole };
