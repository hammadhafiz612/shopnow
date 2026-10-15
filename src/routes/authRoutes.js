const express = require("express");
const auth = require("../controllers/authController");
const { requireLogin, guestOnly } = require("../middleware/auth");
const { exposeCsrf, verifyCsrf } = require("../middleware/csrf");
const limits = require("../middleware/authRateLimits");

const router = express.Router();
router.get("/register", guestOnly, exposeCsrf, auth.showRegister);
router.post("/register", guestOnly, verifyCsrf, limits.registrationLimiter, auth.register);
router.get("/login", guestOnly, exposeCsrf, auth.showLogin);
router.post("/login", guestOnly, verifyCsrf, limits.loginLimiter, auth.login);
router.post("/logout", requireLogin, verifyCsrf, auth.logout);
router.get("/account", requireLogin, auth.showAccount);
router.get("/forgot-password", exposeCsrf, auth.showForgotPassword);
router.post("/forgot-password", verifyCsrf, limits.forgotPasswordLimiter, auth.requestReset);
router.get("/reset-password", exposeCsrf, auth.showResetPassword);
router.post("/reset-password", verifyCsrf, limits.resetPasswordLimiter, auth.resetPassword);

module.exports = router;
