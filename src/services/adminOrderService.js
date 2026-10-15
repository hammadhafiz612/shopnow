const { Op, QueryTypes } = require("sequelize");
const { sequelize, User, Product, Category, Order } = require("../models");
const { lockAdmin } = require("./adminAccess");
const orders = require("./orderService");
const { LOW_STOCK } = require("../utils/adminValidation");
const formatPrice = require("../utils/formatPrice");
const ShoppingError = require("../utils/ShoppingError");
const notifications = require("./notificationService");

const customerJoin = { model: User, as: "customer", attributes: ["id", "full_name", "email"] };

function allowedStatuses(order) {
  if (order.order_status === "pending") return [...(order.payment_status === "paid" ? ["processing"] : []), "cancelled"];
  if (order.order_status === "processing") return [...(order.payment_status === "paid" ? ["shipped"] : []), "cancelled"];
  if (order.order_status === "shipped" && order.payment_status === "paid") return ["delivered"];
  return [];
}

async function get(id) {
  const row = await Order.findByPk(id, { include: [customerJoin] });
  if (!row) throw new ShoppingError("That order was not found.", 404);
  return { ...await orders.details(String(row.user_id), id), customer: row.customer.toJSON(), allowedStatuses: allowedStatuses(row) };
}

async function list(filters, limit = 20) {
  const where = {};
  if (filters.status) where.order_status = filters.status;
  if (filters.payment) where.payment_status = filters.payment;
  if (filters.q) {
    const pattern = { [Op.iLike]: "%" + filters.q.replace(/[\\%_]/g, "\\$&") + "%" };
    where[Op.or] = [{ order_number: pattern }, { "$customer.full_name$": pattern }, { "$customer.email$": pattern }];
  }
  const { rows, count } = await Order.findAndCountAll({ where, include: [customerJoin], order: [["created_at", "DESC"], ["id", "DESC"]], limit, offset: ((filters.page || 1) - 1) * limit });
  return { items: rows.map(row => ({ ...orders.present(row), customer: row.customer.toJSON() })), total: count, page: filters.page || 1, pageSize: limit, pages: Math.max(1, Math.ceil(count / limit)) };
}

async function updateStatus(owner, id, target, expected) {
  return sequelize.transaction(async transaction => {
    const hint = await Order.findByPk(id, { attributes: ["user_id"], transaction });
    if (!hint) throw new ShoppingError("That order was not found.", 404);
    await lockAdmin(owner, transaction, hint.user_id);
    const order = await Order.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (String(order.user_id) !== String(hint.user_id)) throw new ShoppingError("Order ownership changed. Reload this order.", 409);
    if (order.order_status === target) return;
    if (order.order_status !== expected) throw new ShoppingError("This order changed while the page was open. Reload before changing its status.", 409);
    if (!allowedStatuses(order).includes(target)) throw new ShoppingError("That status change is not allowed. Only paid orders can ship; shipped/delivered orders cannot be cancelled.", 409);
    if (target === "cancelled") await orders.restoreInventory(order, transaction);
    else {
      await order.update({ order_status: target }, { transaction });
      await notifications.orderMessage(order, "order:" + order.id + ":" + target, "order_status", transaction);
    }
  });
}

async function summary() {
  const [customers, categories, products, totalOrders, sales, recent, lowStock] = await Promise.all([
    User.count({ where: { role: "customer" } }), Category.count(), Product.count(), Order.count(),
    sequelize.query("SELECT COALESCE(SUM(total_amount), 0)::text AS total FROM orders WHERE payment_status = 'paid' AND order_status = 'delivered'", { type: QueryTypes.SELECT }),
    list({ page: 1 }, 5),
    Product.findAll({ where: { is_active: true, stock_quantity: { [Op.lte]: LOW_STOCK } }, attributes: ["id", "name", "sku", "stock_quantity"], include: [{ model: Category, as: "category", attributes: ["name"], required: true, where: { is_active: true } }], order: [["stock_quantity", "ASC"], ["id", "ASC"]], limit: 10 })
  ]);
  const totalSales = sales[0].total;
  return { customers, categories, products, orders: totalOrders, totalSales, totalSalesLabel: formatPrice(totalSales), recentOrders: recent.items, lowStock: lowStock.map(row => row.toJSON()), lowStockThreshold: LOW_STOCK };
}

module.exports = { get, list, updateStatus, summary };
