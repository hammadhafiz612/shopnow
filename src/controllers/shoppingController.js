const cart = require("../services/cartService");
const wishlist = require("../services/wishlistService");
const validation = require("../utils/shoppingValidation");
const { isApiRequest } = require("../utils/authSession");

async function showCart(req, res) {
  const snapshot = await cart.snapshot(validation.requestOwner(req));
  res.set("Cache-Control", "no-store");
  if (isApiRequest(req)) return res.json({ cart: snapshot });
  res.render("shopping/cart", {
    title: "Your cart | ShopNow", activeNav: "cart", year: new Date().getFullYear(), cart: snapshot
  });
}

async function cartResponse(req, res, notice, message) {
  if (isApiRequest(req)) return res.json({ message, cart: await cart.snapshot(validation.requestOwner(req)) });
  res.redirect(303, validation.withNotice(validation.shoppingReturn(req.body && req.body.returnTo), notice));
}

async function addToCart(req, res) {
  const body = req.body || {};
  await cart.changeQuantity(validation.requestOwner(req), validation.productId(body.productId), validation.quantity(body.quantity, 1), true);
  return cartResponse(req, res, "cart-added", "Product added to your cart.");
}

async function updateCartItem(req, res) {
  await cart.changeQuantity(validation.requestOwner(req), validation.productId(req.params.productId), validation.quantity(req.body && req.body.quantity));
  return cartResponse(req, res, "cart-updated", "Cart quantity updated.");
}

async function removeCartItem(req, res) {
  await cart.removeItem(validation.requestOwner(req), validation.productId(req.params.productId));
  return cartResponse(req, res, "cart-removed", "Product removed from your cart.");
}

async function clearCart(req, res) {
  await cart.clearCart(validation.requestOwner(req));
  return cartResponse(req, res, "cart-cleared", "Your cart is empty.");
}

async function showWishlist(req, res) {
  const snapshot = await wishlist.snapshot(req.currentUser.id);
  res.set("Cache-Control", "no-store");
  if (isApiRequest(req)) return res.json({ wishlist: snapshot });
  res.render("shopping/wishlist", {
    title: "Your wishlist | ShopNow", activeNav: "wishlist", year: new Date().getFullYear(), wishlist: snapshot
  });
}

async function addToWishlist(req, res) {
  await wishlist.add(validation.requestOwner(req), validation.productId(req.body && req.body.productId));
  if (isApiRequest(req)) return res.json({ message: "Product saved to your wishlist.", wishlist: await wishlist.snapshot(req.currentUser.id) });
  res.redirect(303, validation.withNotice(validation.shoppingReturn(req.body && req.body.returnTo, "/wishlist"), "wishlist-added"));
}

async function removeWishlistItem(req, res) {
  await wishlist.remove(validation.requestOwner(req), validation.productId(req.params.productId));
  if (isApiRequest(req)) return res.json({ message: "Product removed from your wishlist.", wishlist: await wishlist.snapshot(req.currentUser.id) });
  res.redirect(303, "/wishlist?notice=wishlist-removed");
}

module.exports = { showCart, addToCart, updateCartItem, removeCartItem, clearCart, showWishlist, addToWishlist, removeWishlistItem };
