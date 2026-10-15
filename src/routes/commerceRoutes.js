const express = require("express");
const commerce = require("../controllers/commerceController");
const { exposeCsrf, verifyCsrf } = require("../middleware/csrf");

const router = express.Router();
router.use(["/addresses", "/checkout", "/orders"], (req, res, next) => {
  if (req.currentUser) return next();
  const target = req.method === "GET" ? req.originalUrl : req.originalUrl.startsWith("/checkout") ? "/checkout" : req.originalUrl.startsWith("/orders") ? "/orders" : "/addresses";
  res.redirect(303, "/login?next=" + encodeURIComponent(target));
});
router.get("/addresses", exposeCsrf, commerce.showAddresses);
router.get("/addresses/new", exposeCsrf, commerce.showAddressForm);
router.get("/addresses/:id/edit", exposeCsrf, commerce.showAddressForm);
router.post("/addresses", verifyCsrf, commerce.saveAddress);
router.post("/addresses/:id/update", verifyCsrf, commerce.saveAddress);
router.post("/addresses/:id/remove", verifyCsrf, commerce.removeAddress);
router.post("/addresses/:id/default", verifyCsrf, commerce.defaultAddress);
router.get("/checkout", exposeCsrf, commerce.showCheckout);
router.post("/checkout/review", verifyCsrf, commerce.reviewCheckout);
router.post("/checkout", verifyCsrf, commerce.placeOrder);
router.get("/orders", exposeCsrf, commerce.showOrders);
router.get("/orders/:id", exposeCsrf, commerce.showOrder);
router.post("/orders/:id/pay", verifyCsrf, commerce.payOrder);
router.post("/orders/:id/cancel", verifyCsrf, commerce.cancelOrder);

module.exports = router;
