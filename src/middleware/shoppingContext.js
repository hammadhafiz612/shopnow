const cart = require("../services/cartService");
const wishlist = require("../services/wishlistService");
const { requestOwner, shoppingReturn } = require("../utils/shoppingValidation");
const { requireLogin } = require("./auth");
const { isApiRequest } = require("../utils/authSession");

const NOTICES = {
  "address-saved": { message: "Delivery address saved.", href: "/addresses", label: "Your addresses" },
  "address-removed": { message: "Delivery address removed. Previous orders keep their delivery details.", href: "/addresses", label: "Your addresses" },
  "address-default": { message: "Default delivery address updated.", href: "/addresses", label: "Your addresses" },
  "order-placed": { message: "Order placed. Complete the demo payment below.", href: "/orders", label: "Your orders" },
  "payment-success": { message: "Demo payment succeeded. Your order is now processing.", href: "/orders", label: "Your orders" },
  "payment-failed": { message: "Demo payment failed. Retry below or cancel this unpaid order to release its stock.", href: "/orders", label: "Your orders" },
  "order-cancelled": { message: "Order cancelled. Stock and any coupon reservation have been restored.", href: "/products", label: "Browse products" },
  "cart-added": { message: "Product added to your cart.", href: "/cart", label: "View cart" },
  "cart-updated": { message: "Cart quantity updated.", href: "/cart", label: "View cart" },
  "cart-removed": { message: "Product removed from your cart.", href: "/cart", label: "View cart" },
  "cart-cleared": { message: "Your cart is empty.", href: "/products", label: "Browse products" },
  "wishlist-added": { message: "Product saved to your wishlist.", href: "/wishlist", label: "View wishlist" },
  "wishlist-removed": { message: "Product removed from your wishlist.", href: "/wishlist", label: "View wishlist" },
  "cart-merged": { message: "Your guest cart has been saved to your account.", href: "/cart", label: "Review cart" },
  "cart-merge-adjusted": { message: "Your guest cart was saved. Some items or quantities were adjusted to current availability. Please review your cart.", href: "/cart", label: "Review cart" }
};

async function shoppingContext(req, res, next) {
  res.locals.cartCount = 0;
  res.locals.wishlistCount = 0;
  res.locals.shoppingNotice = typeof req.query.notice === "string" && Object.hasOwn(NOTICES, req.query.notice) ? NOTICES[req.query.notice] : null;
  res.locals.shoppingReturnTo = shoppingReturn(req.originalUrl);
  if (!isApiRequest(req)) {
    const counts = await Promise.all([
      cart.itemCount(requestOwner(req)),
      req.currentUser ? wishlist.count(req.currentUser.id) : Promise.resolve(0)
    ]);
    res.locals.cartCount = counts[0];
    res.locals.wishlistCount = counts[1];
  }
  next();
}

function requireWishlistLogin(req, res, next) {
  if (!req.currentUser && !isApiRequest(req)) return res.redirect(303, "/login?next=%2Fwishlist");
  requireLogin(req, res, next);
}

module.exports = { shoppingContext, requireWishlistLogin };
