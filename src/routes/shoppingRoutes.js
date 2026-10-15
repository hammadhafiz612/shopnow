const express = require("express");
const shopping = require("../controllers/shoppingController");
const { exposeCsrf, verifyCsrf } = require("../middleware/csrf");
const { requireWishlistLogin } = require("../middleware/shoppingContext");

const router = express.Router();
router.get("/cart", exposeCsrf, shopping.showCart);
router.post("/cart/items", verifyCsrf, shopping.addToCart);
router.post("/cart/items/:productId/update", verifyCsrf, shopping.updateCartItem);
router.post("/cart/items/:productId/remove", verifyCsrf, shopping.removeCartItem);
router.post("/cart/clear", verifyCsrf, shopping.clearCart);
router.get("/wishlist", requireWishlistLogin, exposeCsrf, shopping.showWishlist);
router.post("/wishlist/items", requireWishlistLogin, verifyCsrf, shopping.addToWishlist);
router.post("/wishlist/items/:productId/remove", requireWishlistLogin, verifyCsrf, shopping.removeWishlistItem);

module.exports = router;
