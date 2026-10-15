const { UniqueConstraintError } = require("sequelize");
const auth = require("../services/authService");
const resets = require("../services/passwordResetService");
const validation = require("../utils/authValidation");
const { signIn, signOut, isApiRequest } = require("../utils/authSession");
const { withNotice } = require("../utils/shoppingValidation");

const RESET_MESSAGE = "If an account matches that email, a password reset link will be sent. Check your inbox and spam folder.";

function renderForm(req, res, view, locals = {}, status = 200) {
  const titles = { register: "Create an account", login: "Sign in", forgot: "Reset your password", reset: "Choose a new password" };
  res.set("Cache-Control", "no-store");
  res.status(status).render("auth/" + view, {
    title: `${titles[view]} | ShopNow`, activeNav: view === "register" ? "register" : "login",
    year: new Date().getFullYear(), values: {}, errors: [], message: "", nextUrl: "/account", token: "", ...locals
  });
}

function formErrors(req, res, view, values, errors, status = 400, extra = {}) {
  if (isApiRequest(req)) return res.status(status).json({ message: "Please check the submitted information.", errors });
  renderForm(req, res, view, { values, errors, ...extra }, status);
}

function showRegister(req, res) {
  renderForm(req, res, "register", { nextUrl: validation.safeNext(req.query.next) });
}

async function register(req, res) {
  const { values, errors } = validation.validateRegistration(req.body);
  const nextUrl = validation.safeNext(req.body && req.body.next);
  if (errors.length) return formErrors(req, res, "register", values, errors, 400, { nextUrl });
  let user;
  try {
    user = await auth.registerCustomer(values, req.body.password);
  } catch (error) {
    if (!(error instanceof UniqueConstraintError)) throw error;
    return formErrors(req, res, "register", values, ["An account already uses that email. Sign in or reset your password."], 409, { nextUrl });
  }
  const cartMerge = await signIn(req, user);
  if (isApiRequest(req)) return res.status(201).json({ user: auth.publicUser(user), csrfToken: req.session.csrfToken, cartMerge });
  res.redirect(303, cartMerge.merged ? withNotice(nextUrl, cartMerge.adjustments.length ? "cart-merge-adjusted" : "cart-merged") : nextUrl);
}

function showLogin(req, res) {
  renderForm(req, res, "login", {
    nextUrl: validation.safeNext(req.query.next),
    message: req.query.reset === "success" ? "Your password has been reset. Sign in with your new password." : ""
  });
}

async function login(req, res) {
  const { values, errors } = validation.validateLogin(req.body);
  const nextUrl = validation.safeNext(req.body && req.body.next);
  if (errors.length) return formErrors(req, res, "login", values, errors, 400, { nextUrl });
  const user = await auth.authenticate(values.email, req.body.password);
  if (!user) {
    return formErrors(req, res, "login", values, ["The email or password is incorrect."], 401, { nextUrl });
  }
  const cartMerge = await signIn(req, user);
  if (isApiRequest(req)) return res.json({ user: auth.publicUser(user), csrfToken: req.session.csrfToken, cartMerge });
  res.redirect(303, cartMerge.merged ? withNotice(nextUrl, cartMerge.adjustments.length ? "cart-merge-adjusted" : "cart-merged") : nextUrl);
}

async function logout(req, res) {
  await signOut(req, res);
  if (isApiRequest(req)) return res.json({ message: "You have been signed out." });
  res.redirect(303, "/");
}

function showAccount(req, res) {
  res.set("Cache-Control", "no-store");
  res.render("account", { title: "My account | ShopNow", activeNav: "account", year: new Date().getFullYear() });
}

function me(req, res) {
  res.set("Cache-Control", "no-store");
  res.json({ user: req.currentUser });
}

function csrf(req, res) {
  res.json({ csrfToken: req.session.csrfToken });
}

function showForgotPassword(req, res) {
  renderForm(req, res, "forgot");
}

async function requestReset(req, res) {
  const email = validation.normalizeEmail(req.body && req.body.email);
  if (!validation.validEmail(email)) return formErrors(req, res, "forgot", { email: email.slice(0, 254) }, ["Enter a valid email address."]);
  await resets.requestReset(email);
  if (isApiRequest(req)) return res.json({ message: RESET_MESSAGE });
  renderForm(req, res, "forgot", { message: RESET_MESSAGE });
}

function invalidReset(req, res) {
  const message = "This password reset link is invalid, expired or already used. Request a new link.";
  if (isApiRequest(req)) return res.status(400).json({ message });
  renderForm(req, res, "reset", { errors: [message] }, 400);
}

async function showResetPassword(req, res) {
  const token = req.query.token;
  if (!validation.validResetToken(token) || !await resets.isUsableToken(token)) return invalidReset(req, res);
  renderForm(req, res, "reset", { token });
}

async function resetPassword(req, res) {
  const body = req.body || {};
  if (!validation.validResetToken(body.token) || !await resets.isUsableToken(body.token)) return invalidReset(req, res);
  const errors = validation.validatePassword(body.password, body.confirmPassword);
  if (errors.length) return formErrors(req, res, "reset", {}, errors, 400, { token: body.token });
  if (!await resets.resetPassword(body.token, body.password)) return invalidReset(req, res);
  await signOut(req, res);
  if (isApiRequest(req)) return res.json({ message: "Password reset complete. Sign in with your new password." });
  res.redirect(303, "/login?reset=success");
}

module.exports = { showRegister, register, showLogin, login, logout, showAccount, me, csrf, showForgotPassword, requestReset, showResetPassword, resetPassword };
