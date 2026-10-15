const images = require("../services/productImageService");
const { id } = require("../utils/checkoutValidation");
const { text } = require("../utils/adminValidation");
const { requestOwner } = require("../utils/shoppingValidation");
const { isApiRequest } = require("../utils/authSession");
const ShoppingError = require("../utils/ShoppingError");

async function checkProduct(req, res, next) {
  req.imageProductId = id(req.params.id, "product");
  await images.product(req.imageProductId);
  next();
}

async function show(req, res) {
  const productId = id(req.params.id, "product");
  const product = await images.product(productId);
  const items = await images.list(productId);
  if (isApiRequest(req)) return res.json({ product: { id: String(product.id), name: product.name, sku: product.sku }, images: items, maximum: images.MAX_IMAGES });
  res.render("admin/images", { title: "Product images | ShopNow admin", activeNav: "admin", adminSection: "products", adminNotice: req.query.notice === "image-saved" ? "Product images updated." : "", year: new Date().getFullYear(), product, images: items, maximum: images.MAX_IMAGES });
}

async function response(req, res) {
  if (isApiRequest(req)) return res.json({ message: "Product images updated.", images: await images.list(req.imageProductId || id(req.params.id, "product")) });
  res.redirect(303, "/admin/products/" + req.params.id + "/images?notice=image-saved");
}

async function upload(req, res) {
  const body = req.body || {};
  if (![undefined, "0", "1", false, true].includes(body.make_primary)) throw new ShoppingError("Choose a valid primary image option.");
  await images.upload(requestOwner(req), req.imageProductId, req.file, text(body.alt_text, "Image description", 200, true), ["1", true].includes(body.make_primary));
  return response(req, res);
}

function change(action) {
  return async (req, res) => {
    await images.change(requestOwner(req), id(req.params.id, "product"), id(req.params.imageId, "image"), action, action === "alt" ? text(req.body && req.body.alt_text, "Image description", 200, true) : "");
    return response(req, res);
  };
}

function error(error, req, res, next) {
  if (!(error instanceof ShoppingError) || isApiRequest(req)) return next(error);
  res.status(error.statusCode).render("admin/action-error", { title: "Review image update | ShopNow admin", activeNav: "admin", adminSection: "products", adminNotice: "", year: new Date().getFullYear(), message: error.message, recoveryHref: "/admin/products/" + req.params.id + "/images", recoveryLabel: "Return to product images" });
}

module.exports = { checkProduct, show, upload, change, error };
