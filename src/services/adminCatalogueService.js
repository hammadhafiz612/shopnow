const { Op, fn, col, UniqueConstraintError } = require("sequelize");
const { sequelize, Category, Product, Coupon, CouponRedemption, Order, OrderItem } = require("../models");
const { lockAdmin } = require("./adminAccess");
const v = require("../utils/adminValidation");
const formatPrice = require("../utils/formatPrice");
const ShoppingError = require("../utils/ShoppingError");

const PAGE_SIZE = 20;
const definitions = { categories: { model: Category, kind: "category", label: "category" }, products: { model: Product, kind: "product", label: "product" }, coupons: { model: Coupon, kind: "coupon", label: "coupon" } };
const categoryJoin = { model: Category, as: "category", attributes: ["id", "name", "is_active"] };
const searchPattern = value => "%" + value.replace(/[\\%_]/g, "\\$&") + "%";

function present(resource, model) {
  const row = model.get({ plain: true });
  return { ...row, id: String(row.id), revision: v.revision(definitions[resource].kind, row), ...(resource === "products" ? { priceLabel: formatPrice(row.price), storefrontActive: Boolean(row.is_active && row.category?.is_active) } : {}) };
}

async function get(resource, id, transaction, lock = false) {
  const definition = definitions[resource];
  const row = await definition.model.findByPk(id, { transaction, ...(lock ? { lock: transaction.LOCK.UPDATE } : {}), ...(!transaction && resource === "products" ? { include: [categoryJoin] } : {}) });
  if (!row) throw new ShoppingError(`That ${definition.label} was not found.`, 404);
  return row;
}

async function categories() {
  return Category.findAll({ attributes: ["id", "name", "is_active"], order: [["name", "ASC"], ["id", "ASC"]] });
}

async function list(resource, filters) {
  const definition = definitions[resource === "inventory" ? "products" : resource];
  const where = {};
  if (filters.state !== "all") where.is_active = filters.state === "active";
  if (filters.q) {
    const pattern = { [Op.iLike]: searchPattern(filters.q) };
    const fields = definition.kind === "product" ? ["name", "sku"] : definition.kind === "coupon" ? ["code"] : ["name", "slug"];
    where[Op.or] = fields.map(field => ({ [field]: pattern }));
  }
  if (definition.kind === "product") {
    if (filters.category) where.category_id = filters.category;
    if (filters.low) where.stock_quantity = { [Op.lte]: v.LOW_STOCK };
  }
  const include = definition.kind === "product" ? [categoryJoin] : [];
  const { count, rows } = await definition.model.findAndCountAll({ where, include, order: resource === "inventory" ? [["stock_quantity", "ASC"], ["id", "ASC"]] : [["id", "DESC"]], limit: PAGE_SIZE, offset: (filters.page - 1) * PAGE_SIZE });
  const items = rows.map(row => present(resource === "inventory" ? "products" : resource, row));
  if (items.length && ["category", "coupon"].includes(definition.kind)) {
    const foreignKey = definition.kind === "category" ? "category_id" : "coupon_id";
    const model = definition.kind === "category" ? Product : CouponRedemption;
    const counts = await model.findAll({ attributes: [foreignKey, [fn("COUNT", col("id")), "used"]], where: { [foreignKey]: { [Op.in]: items.map(item => item.id) }, ...(definition.kind === "coupon" ? { status: "active" } : {}) }, group: [foreignKey], raw: true });
    const byId = new Map(counts.map(row => [String(row[foreignKey]), Number(row.used)]));
    for (const item of items) item[definition.kind === "category" ? "productCount" : "activeUses"] = byId.get(item.id) || 0;
  }
  return { items, page: filters.page, pageSize: PAGE_SIZE, total: count, pages: Math.max(1, Math.ceil(count / PAGE_SIZE)) };
}

async function checkCouponLimits(coupon, values, transaction) {
  if (values.code !== coupon.code && await Order.count({ where: { coupon_id: coupon.id }, transaction })) throw new ShoppingError("This coupon has order history. Keep its code and create a new coupon for a different code.", 409);
  const where = { coupon_id: coupon.id, status: "active" };
  const used = await CouponRedemption.count({ where, transaction });
  if (values.global_usage_limit !== null && used > values.global_usage_limit) throw new ShoppingError(`The global limit cannot be below ${used} active uses.`, 409);
  if (values.per_user_usage_limit !== null) {
    const counts = await CouponRedemption.findAll({ attributes: ["user_id", [fn("COUNT", col("id")), "used"]], where, group: ["user_id"], transaction, raw: true });
    const maximum = counts.reduce((max, row) => Math.max(max, Number(row.used)), 0);
    if (maximum > values.per_user_usage_limit) throw new ShoppingError(`The per-customer limit cannot be below ${maximum} existing active uses.`, 409);
  }
}

async function save(owner, resource, id, values, revision) {
  try {
    return await sequelize.transaction(async transaction => {
      await lockAdmin(owner, transaction);
      const existing = id ? await get(resource, id, transaction, true) : null;
      if (existing) v.checkRevision(definitions[resource].kind, existing, revision);
      if (resource === "products") {
        const category = await Category.findByPk(values.category_id, { transaction, lock: transaction.LOCK.SHARE });
        if (!category) throw new ShoppingError("Choose an existing category.");
        if (values.is_active && !category.is_active) throw new ShoppingError("Choose an active category before making this product active.");
      }
      if (resource === "coupons" && existing) await checkCouponLimits(existing, values, transaction);
      const row = existing ? await existing.update(values, { transaction }) : await definitions[resource].model.create(values, { transaction });
      return String(row.id);
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) throw new ShoppingError("This slug, SKU or coupon code is already in use. Choose another value.", 409);
    throw error;
  }
}

async function setStock(owner, id, target, expected) {
  return sequelize.transaction(async transaction => {
    await lockAdmin(owner, transaction);
    const product = await get("products", id, transaction, true);
    if (product.stock_quantity !== expected) throw new ShoppingError("Stock changed while this page was open. Reload inventory before setting a new quantity.", 409);
    const reserved = await OrderItem.findAll({
      attributes: [[fn("SUM", col("OrderItem.quantity")), "reserved"]], where: { product_id: id },
      include: [{ model: Order, as: "order", attributes: [], required: true, where: { order_status: { [Op.in]: ["pending", "processing"] }, inventory_restored_at: null } }], raw: true, transaction
    });
    if (BigInt(target) + BigInt(reserved[0].reserved || "0") > BigInt(v.MAX_STOCK)) throw new ShoppingError("That stock level leaves no room to restore existing cancellable orders. Choose a lower quantity.", 409);
    await product.update({ stock_quantity: target }, { transaction });
  });
}

module.exports = { get, present, categories, list, save, setStock };
