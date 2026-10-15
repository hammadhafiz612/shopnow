const { randomUUID } = require("node:crypto");
const { Op, UniqueConstraintError } = require("sequelize");
const { sequelize, Cart, CartItem, Product, Category, Order, OrderItem, OrderAddress, CouponRedemption, Coupon } = require("../models");
const { lockUser } = require("./shoppingOwner");
const addresses = require("./addressService");
const coupons = require("./couponService");
const quotes = require("../utils/checkoutQuote");
const { ADDRESS_FIELDS } = require("../utils/checkoutValidation");
const { MAX_CART_LINES, MAX_QUANTITY } = require("../utils/shoppingValidation");
const { toMinorUnits, toDecimal } = require("../utils/money");
const formatPrice = require("../utils/formatPrice");
const ShoppingError = require("../utils/ShoppingError");
const notifications = require("./notificationService");

const MAX_AMOUNT = 999999999999n; // DECIMAL(12, 2).

async function lockedProducts(ids, transaction, checkCategories = false) {
  const products = await Product.findAll({ where: { id: { [Op.in]: ids } }, order: [["id", "ASC"]], transaction, lock: transaction.LOCK.UPDATE });
  const categoryMap = new Map();
  if (checkCategories && products.length) {
    const categories = await Category.findAll({ where: { id: { [Op.in]: [...new Set(products.map(product => product.category_id))] } }, order: [["id", "ASC"]], transaction, lock: transaction.LOCK.SHARE });
    for (const category of categories) categoryMap.set(String(category.id), category);
  }
  return { products, categoryMap };
}

async function review(owner, addressId, couponCode, transaction) {
  const savedAddresses = await addresses.list(owner.userId, transaction);
  const address = addressId ? await addresses.get(owner.userId, addressId, transaction) : savedAddresses[0] || null;
  const cart = await Cart.findOne({ where: { user_id: owner.userId }, transaction });
  const rows = cart ? await CartItem.findAll({ where: { cart_id: cart.id }, order: [["product_id", "ASC"]], transaction }) : [];
  if (rows.length > MAX_CART_LINES) throw new ShoppingError("Your cart has too many products. Review your cart.", 409);
  // Lock order throughout checkout/cancellation: user, existing order, coupon, products by ID, categories by ID.
  const coupon = rows.length ? await coupons.lock(couponCode, transaction) : null;
  const { products, categoryMap } = await lockedProducts(rows.map(row => row.product_id), transaction, true);
  const byId = new Map(products.map(product => [String(product.id), product]));
  let subtotal = 0n;
  const items = rows.map(row => {
    const product = byId.get(String(row.product_id));
    if (!product || !product.is_active || !categoryMap.get(String(product.category_id))?.is_active) {
      throw new ShoppingError("A product in your cart is no longer available. Review your cart.", 409);
    }
    if (row.quantity < 1 || row.quantity > MAX_QUANTITY || row.quantity > product.stock_quantity) {
      throw new ShoppingError(`Stock has changed for ${product.name}. Review its quantity in your cart.`, 409);
    }
    const lineTotal = toMinorUnits(product.price) * BigInt(row.quantity);
    subtotal += lineTotal;
    return { productId: String(product.id), name: product.name, quantity: row.quantity, unitPrice: String(product.price), unitPriceLabel: formatPrice(product.price), lineTotal: toDecimal(lineTotal), lineTotalLabel: formatPrice(toDecimal(lineTotal)) };
  });
  if (subtotal > MAX_AMOUNT) throw new ShoppingError("The order amount is too large. Reduce the quantities in your cart.", 409);
  const discount = await coupons.discount(coupon, owner.userId, subtotal, transaction);
  const delivery = address ? Object.fromEntries(ADDRESS_FIELDS.map(field => [field, address[field]])) : null;
  const summary = {
    addresses: savedAddresses.map(row => row.toJSON()), addressId: address ? String(address.id) : "", deliveryAddress: delivery,
    coupon: coupons.present(coupon), couponCode, items, itemCount: items.reduce((count, item) => count + item.quantity, 0),
    subtotal: toDecimal(subtotal), discountAmount: toDecimal(discount), totalAmount: toDecimal(subtotal - discount), currency: "PKR"
  };
  summary.subtotalLabel = formatPrice(summary.subtotal);
  summary.discountLabel = formatPrice(summary.discountAmount);
  summary.totalLabel = formatPrice(summary.totalAmount);
  const hash = quotes.fingerprint({ addressId: summary.addressId, delivery, items: items.map(({ productId, name, quantity, unitPrice }) => ({ productId, name, quantity, unitPrice })), coupon: summary.coupon, discount: summary.discountAmount, total: summary.totalAmount });
  return { summary, hash, cart, coupon, products };
}

async function preview(owner, addressId, couponCode) {
  return sequelize.transaction(async transaction => {
    await lockUser(owner, transaction);
    const { summary, hash } = await review(owner, addressId, couponCode, transaction);
    const checkoutKey = randomUUID();
    return {
      ...summary, checkoutKey,
      quoteToken: summary.items.length && summary.addressId ? quotes.create({ userId: owner.userId, addressId: summary.addressId, couponCode, checkoutKey, hash }) : ""
    };
  });
}

async function place(owner, input) {
  const quote = quotes.read(input.quoteToken);
  if (quote.userId !== owner.userId || quote.addressId !== input.addressId || quote.couponCode !== input.couponCode || quote.checkoutKey !== input.checkoutKey) {
    throw new ShoppingError("Your order review has changed. Review checkout again.", 409);
  }
  try {
    return await sequelize.transaction(async transaction => {
      await lockUser(owner, transaction);
      const existing = await Order.findOne({ where: { checkout_key: input.checkoutKey }, transaction });
      if (existing) {
        if (String(existing.user_id) !== owner.userId) throw new ShoppingError("This confirmation key is already in use. Review checkout again.", 409);
        return { id: String(existing.id), created: false };
      }
      if (quote.expiresAt <= Date.now()) throw new ShoppingError("Your order review has expired. Review checkout again.", 409);
      const current = await review(owner, input.addressId, input.couponCode, transaction);
      if (!current.summary.items.length) throw new ShoppingError("Your cart is empty. Add a product before checking out.", 409);
      if (current.hash !== quote.hash) throw new ShoppingError("Prices, quantities, discounts or your delivery address have changed. Review checkout again before confirming.", 409);
      const summary = current.summary;
      const order = await Order.create({
        user_id: owner.userId, selected_address_id: summary.addressId, coupon_id: current.coupon?.id || null,
        order_number: "SN-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase(),
        checkout_key: input.checkoutKey, subtotal: summary.subtotal, discount_amount: summary.discountAmount, total_amount: summary.totalAmount, currency: "PKR"
      }, { transaction });
      await OrderItem.bulkCreate(summary.items.map(item => ({ order_id: order.id, product_id: item.productId, product_name: item.name, unit_price: item.unitPrice, quantity: item.quantity, line_total: item.lineTotal })), { transaction, validate: true });
      await OrderAddress.create({ order_id: order.id, ...summary.deliveryAddress }, { transaction });
      if (current.coupon) await CouponRedemption.create({ coupon_id: current.coupon.id, user_id: owner.userId, order_id: order.id, discount_amount: summary.discountAmount }, { transaction });
      const byId = new Map(current.products.map(product => [String(product.id), product]));
      for (const item of summary.items) {
        const product = byId.get(item.productId);
        await product.update({ stock_quantity: product.stock_quantity - item.quantity }, { transaction });
      }
      await CartItem.destroy({ where: { cart_id: current.cart.id }, transaction });
      await notifications.orderMessage(order, "confirmation:" + order.id, "order_confirmation", transaction);
      return { id: String(order.id), created: true };
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) throw new ShoppingError("This confirmation key has already been used. Open your orders or review checkout again.", 409);
    throw error;
  }
}

async function owned(userId, id, transaction, lock = false) {
  const order = await Order.findOne({ where: { id, user_id: userId }, transaction, ...(lock ? { lock: transaction.LOCK.UPDATE } : {}) });
  if (!order) throw new ShoppingError("That order was not found.", 404);
  return order;
}

function present(order) {
  return {
    id: String(order.id), orderNumber: order.order_number, subtotal: String(order.subtotal), discountAmount: String(order.discount_amount), totalAmount: String(order.total_amount),
    subtotalLabel: formatPrice(order.subtotal), discountLabel: formatPrice(order.discount_amount), totalLabel: formatPrice(order.total_amount), currency: order.currency,
    orderStatus: order.order_status, paymentStatus: order.payment_status,
    canPay: order.order_status === "pending" && order.payment_status !== "paid",
    canCancel: order.order_status === "pending" && order.payment_status !== "paid", createdAt: order.created_at,
    placedLabel: order.created_at.toISOString().slice(0, 10)
  };
}

async function details(userId, id) {
  const order = await owned(userId, id);
  const [items, address, payments, coupon] = await Promise.all([
    order.getItems({ order: [["id", "ASC"]] }), order.getDeliveryAddress(), order.getPayments({ order: [["id", "DESC"]] }), order.getCoupon({ attributes: ["code"] })
  ]);
  return {
    ...present(order), couponCode: coupon?.code || "", deliveryAddress: address ? Object.fromEntries(ADDRESS_FIELDS.map(field => [field, address[field]])) : null,
    items: items.map(item => ({ productId: String(item.product_id), name: item.product_name, quantity: item.quantity, unitPrice: String(item.unit_price), unitPriceLabel: formatPrice(item.unit_price), lineTotal: String(item.line_total), lineTotalLabel: formatPrice(item.line_total) })),
    payments: payments.map(payment => ({ reference: payment.payment_reference, status: payment.status, amount: String(payment.amount), amountLabel: formatPrice(payment.amount), completedAt: payment.completed_at, failureReason: payment.failure_reason }))
  };
}

async function history(userId, page) {
  const pageSize = 10;
  const { rows, count } = await Order.findAndCountAll({ where: { user_id: userId }, order: [["created_at", "DESC"], ["id", "DESC"]], limit: pageSize, offset: (page - 1) * pageSize });
  return { items: rows.map(present), page, pageSize, total: count, pages: Math.max(1, Math.ceil(count / pageSize)) };
}

async function cancel(owner, id) {
  return sequelize.transaction(async transaction => {
    await lockUser(owner, transaction);
    const order = await owned(owner.userId, id, transaction, true);
    if (order.order_status === "cancelled") return;
    if (order.order_status !== "pending" || order.payment_status === "paid" || order.inventory_restored_at) throw new ShoppingError("Only an unpaid pending order can be cancelled from your account.", 409);
    await restoreInventory(order, transaction);
  });
}

async function restoreInventory(order, transaction) {
  if (order.inventory_restored_at) throw new ShoppingError("This order's inventory was already restored.", 409);
  if (order.coupon_id) await Coupon.findByPk(order.coupon_id, { transaction, lock: transaction.LOCK.UPDATE });
  const items = await order.getItems({ transaction });
  const { products } = await lockedProducts(items.map(item => item.product_id), transaction);
  const byId = new Map(products.map(product => [String(product.id), product]));
  for (const item of items) {
    const product = byId.get(String(item.product_id));
    if (!product || product.stock_quantity > 2147483647 - item.quantity) throw new ShoppingError("Inventory could not be restored. Contact the store before trying again.", 409);
    await product.update({ stock_quantity: product.stock_quantity + item.quantity }, { transaction });
  }
  const now = new Date();
  await CouponRedemption.update({ status: "released", released_at: now }, { where: { order_id: order.id, status: "active" }, transaction });
  await order.update({ order_status: "cancelled", inventory_restored_at: now }, { transaction });
  await notifications.orderMessage(order, "order:" + order.id + ":cancelled", "order_status", transaction);
}

module.exports = { preview, place, owned, present, details, history, cancel, restoreInventory };
