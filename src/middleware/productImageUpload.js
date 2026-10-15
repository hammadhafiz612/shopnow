const multer = require("multer");
const { rateLimit } = require("express-rate-limit");
const { MAX_BYTES, TYPES } = require("../services/productImageService");
const ShoppingError = require("../utils/ShoppingError");

const parse = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1, fields: 4, parts: 5, fieldSize: 1024, fieldNameSize: 100 },
  fileFilter(req, file, callback) { callback(Object.hasOwn(TYPES, file.mimetype) ? null : new ShoppingError("Upload a JPEG, PNG or WebP image."), true); }
}).single("image");

function parseImage(req, res, next) {
  parse(req, res, error => {
    if (!error) return next();
    if (error instanceof ShoppingError) return next(error);
    return next(new ShoppingError(error.code === "LIMIT_FILE_SIZE" ? "The image must be 5 MiB or smaller." : "The upload is invalid. Send one image with the required form fields.", error.code === "LIMIT_FILE_SIZE" ? 413 : 400));
  });
}

const imageLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, keyGenerator: req => req.currentUser.id, standardHeaders: "draft-8", legacyHeaders: false, handler(req, res, next) { next(new ShoppingError("Too many uploads. Try again in 15 minutes.", 429)); } });

module.exports = { parseImage, imageLimiter };
