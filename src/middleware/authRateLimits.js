const { rateLimit } = require("express-rate-limit");
const { isApiRequest } = require("../utils/authSession");

function attemptLimiter(limit, skipSuccessfulRequests = false) {
  return rateLimit({
    windowMs: 15 * 60 * 1000, limit, skipSuccessfulRequests,
    standardHeaders: "draft-8", legacyHeaders: false,
    handler(req, res) {
      const message = "Too many attempts. Please try again in 15 minutes.";
      if (isApiRequest(req)) return res.status(429).json({ message });
      res.status(429).render("error", { title: "Please wait | ShopNow", status: 429, message, year: new Date().getFullYear() });
    }
  });
}

// The same limiter instance protects both web and API routes.
module.exports = {
  loginLimiter: attemptLimiter(10, true),
  registrationLimiter: attemptLimiter(20),
  forgotPasswordLimiter: attemptLimiter(5),
  resetPasswordLimiter: attemptLimiter(10)
};
