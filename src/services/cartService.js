const { Cart, CartItem, sequelize } = require("../models");
const catalogue = require("./catalogueService");
const { lockOwner, lockUser, lockGuestSession, cartWhere } = require("./shoppingOwner");
const { MAX_CART_LINES, MAX_QUANTITY } = require("../utils/shoppingValidation");
const { toMinorUnits, toDecimal } = require("../utils/money");
const formatPrice = require("../utils/formatPrice");
const ShoppingError = require("../utils/ShoppingError");

async function getOrCreateCart(owner, transaction) {
  return await Cart.findOne({ where: cartWhere(owner), transaction })
    || Cart.create(cartWhere(owner), { transaction });
}

function assertQuantity(product, quantity) {
  if (!product || !product.available) throw new ShoppingError("That product is not available.", 404);
  if (!product.inStock) throw new ShoppingError("That product is currently out of stock.", 409);
  const maximum = Math.min(MAX_QUANTITY, product.stock_quantity);
  if (quantity > maximum) throw new ShoppingError(`Only ${maximum} can be added in total. Review the quantity already in your cart.`, 409);
}

async function changeQuantity(owner, id, requested, add = false) {
  return sequelize.transaction(async transaction => {
    await lockOwner(owner, transaction);
    const [product] = await catalogue.getShoppingProducts([id], transaction);
    assertQuantity(product, requested);
    const cart = add ? await getOrCreateCart(owner, transaction) : await Cart.findOne({ where: cartWhere(owner), transaction });
    if (!cart) throw new ShoppingError("That item is not in your cart.", 404);
    const item = await CartItem.findOne({ where: { cart_id: cart.id, product_id: id }, transaction });
    if (!add && !item) throw new ShoppingError("That item is not in your cart.", 404);
    const target = add ? (item ? item.quantity : 0) + requested : requested;
    assertQuantity(product, target);
    if (item) {
      await item.update({ quantity: target }, { transaction });
    } else {
      if (await CartItem.count({ where: { cart_id: cart.id }, transaction }) >= MAX_CART_LINES) {
        throw new ShoppingError(`Your cart can hold at most ${MAX_CART_LINES} different products.`, 409);
      }
      await CartItem.create({ cart_id: cart.id, product_id: id, quantity: target }, { transaction });
    }
  });
}

async function removeItem(owner, id) {
  return sequelize.transaction(async transaction => {
    await lockOwner(owner, transaction);
    const cart = await Cart.findOne({ where: cartWhere(owner), transaction });
    if (cart) await CartItem.destroy({ where: { cart_id: cart.id, product_id: id }, transaction });
  });
}

async function clearCart(owner) {
  return sequelize.transaction(async transaction => {
    await lockOwner(owner, transaction);
    const cart = await Cart.findOne({ where: cartWhere(owner), transaction });
    if (cart) await CartItem.destroy({ where: { cart_id: cart.id }, transaction });
  });
}

async function snapshot(owner) {
  const cart = await Cart.findOne({ where: cartWhere(owner), attributes: ["id"] });
  const rows = cart ? await CartItem.findAll({ where: { cart_id: cart.id }, order: [["id", "ASC"]] }) : [];
  const products = await catalogue.getShoppingProducts(rows.map(row => String(row.product_id)));
  const byId = new Map(products.map(product => [product.id, product]));
  let subtotal = 0n;
  const items = rows.map(row => {
    const productId = String(row.product_id);
    const product = byId.get(productId) || {
      id: productId, name: "Unavailable product", price: "0.00", priceLabel: "PKR 0.00",
      stock_quantity: 0, inStock: false, available: false,
      primaryImage: { src: "/images/product-placeholder.svg", alt: "Unavailable product" }
    };
    const maximumQuantity = product.available ? Math.min(MAX_QUANTITY, product.stock_quantity) : 0;
    const lineTotal = toDecimal(toMinorUnits(product.price) * BigInt(row.quantity));
    subtotal += toMinorUnits(lineTotal);
    let warning = "";
    if (!product.available) warning = "This product is unavailable. Remove it from your cart.";
    else if (!product.inStock) warning = "Currently out of stock. Remove this item or check again later.";
    else if (row.quantity > maximumQuantity) warning = `Only ${maximumQuantity} available. Reduce the quantity.`;
    return { productId, product, quantity: row.quantity, maximumQuantity, warning, lineTotal, lineTotalLabel: formatPrice(lineTotal) };
  });
  const total = toDecimal(subtotal);
  return {
    items, itemCount: items.reduce((sum, item) => sum + item.quantity, 0), lineCount: items.length,
    subtotal: total, subtotalLabel: formatPrice(total),
    discountAmount: "0.00", discountLabel: formatPrice("0.00"),
    totalAmount: total, totalLabel: formatPrice(total), currency: "PKR",
    hasWarnings: items.some(item => item.warning),
    maxLines: MAX_CART_LINES, maxQuantity: MAX_QUANTITY
  };
}

async function itemCount(owner) {
  const cart = await Cart.findOne({ where: cartWhere(owner), attributes: ["id"] });
  return cart ? Number(await CartItem.sum("quantity", { where: { cart_id: cart.id } }) || 0) : 0;
}

async function mergeGuestCart(sessionId, user) {
  return sequelize.transaction(async transaction => {
    const owner = { userId: String(user.id), authVersion: user.auth_version };
    await lockUser(owner, transaction);
    const session = await lockGuestSession(sessionId, transaction);
    if (session.cartMergedTo) return { merged: false, adjustments: [] };
    // Claim even an empty guest session before releasing its lock.
    await sequelize.query(
      "UPDATE app_sessions SET sess = jsonb_set(sess::jsonb, '{cartMergedTo}', CAST(:owner AS jsonb), true)::json WHERE sid = :sid",
      { replacements: { owner: JSON.stringify(String(user.id)), sid: sessionId }, transaction }
    );
    const guest = await Cart.findOne({ where: { session_id: sessionId }, transaction });
    if (!guest) return { merged: false, adjustments: [] };
    const guestItems = await CartItem.findAll({ where: { cart_id: guest.id }, order: [["id", "ASC"]], transaction });
    const saved = await getOrCreateCart(owner, transaction);
    const savedItems = await CartItem.findAll({ where: { cart_id: saved.id }, transaction });
    const byId = new Map(savedItems.map(item => [String(item.product_id), item]));
    const products = await catalogue.getShoppingProducts(guestItems.map(item => String(item.product_id)), transaction);
    const productMap = new Map(products.map(product => [product.id, product]));
    const adjustments = [];
    for (const item of guestItems) {
      const id = String(item.product_id);
      const product = productMap.get(id);
      const existing = byId.get(id);
      if (!product || !product.available || !product.inStock) {
        adjustments.push({ productId: id, reason: "unavailable" });
        continue;
      }
      if (!existing && byId.size >= MAX_CART_LINES) {
        adjustments.push({ productId: id, reason: "cart_limit" });
        continue;
      }
      const requested = (existing ? existing.quantity : 0) + item.quantity;
      const quantity = Math.min(requested, MAX_QUANTITY, product.stock_quantity);
      if (existing) await existing.update({ quantity }, { transaction });
      else byId.set(id, await CartItem.create({ cart_id: saved.id, product_id: id, quantity }, { transaction }));
      if (quantity < requested) adjustments.push({ productId: id, reason: "quantity_adjusted", quantity });
    }
    await guest.destroy({ transaction });
    return { merged: guestItems.length > 0, adjustments };
  });
}

module.exports = { changeQuantity, removeItem, clearCart, snapshot, itemCount, mergeGuestCart };
