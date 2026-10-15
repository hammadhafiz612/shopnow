const catalogue = require("../services/adminCatalogueService");
const orders = require("../services/adminOrderService");
const v = require("../utils/adminValidation");
const { id } = require("../utils/checkoutValidation");
const { requestOwner } = require("../utils/shoppingValidation");
const { isApiRequest } = require("../utils/authSession");
const ShoppingError = require("../utils/ShoppingError");

const RESOURCES = {
  categories: { singular: "category", title: "Categories", parse: v.categoryInput },
  products: { singular: "product", title: "Products", parse: v.productInput },
  coupons: { singular: "coupon", title: "Coupons", parse: v.couponInput }
};
const NOTICES = { saved: "Changes saved.", "stock-saved": "Inventory quantity updated.", "status-saved": "Order status updated." };
const page = (req, title, section, extra = {}) => ({
  title: title + " | ShopNow admin", activeNav: "admin", adminSection: section, year: new Date().getFullYear(),
  adminNotice: typeof req.query.notice === "string" && Object.hasOwn(NOTICES, req.query.notice) ? NOTICES[req.query.notice] : "", ...extra
});

const clientError = error => error instanceof ShoppingError && [400, 409].includes(error.statusCode);

async function showDashboard(req, res) {
  res.render("admin/dashboard", page(req, "Store overview", "dashboard", { stats: await orders.summary() }));
}

async function getSummary(req, res) {
  res.json({ summary: await orders.summary() });
}

function resourceList(resource) {
  return async (req, res) => {
    const filters = v.filters(req.query, resource);
    const listing = await catalogue.list(resource, filters);
    if (isApiRequest(req)) return res.json({ [resource]: listing, lowStockThreshold: v.LOW_STOCK });
    res.render("admin/list", page(req, resource === "inventory" ? "Inventory" : RESOURCES[resource].title, resource, {
      resource, listing, filters, errors: [], categories: ["products", "inventory"].includes(resource) ? await catalogue.categories() : [],
      lowStockThreshold: v.LOW_STOCK, pageUrl: number => v.pageUrl("/admin/" + resource, filters, number)
    }));
  };
}

function safeValues(body = {}) {
  const fields = ["name", "slug", "sku", "description", "category_id", "price", "stock_quantity", "code", "discount_type", "discount_value", "min_order_amount", "expires_at", "global_usage_limit", "per_user_usage_limit", "revision"];
  const values = Object.fromEntries(fields.map(field => [field, ["string", "number"].includes(typeof body[field]) ? String(body[field]).slice(0, field === "description" ? 5000 : 200) : ""]));
  values.is_active = [true, "1", "true", undefined].includes(body.is_active);
  return values;
}

async function renderForm(req, res, resource, recordId, values, errors = [], status = 200) {
  const singular = RESOURCES[resource].singular;
  res.status(status).render("admin/form", page(req, (recordId ? "Edit " : "New ") + singular, resource, {
    resource, singular, recordId, values, errors, categories: resource === "products" ? await catalogue.categories() : []
  }));
}

function resourceForm(resource) {
  return async (req, res) => {
    const recordId = req.params.id ? id(req.params.id, RESOURCES[resource].singular) : null;
    const row = recordId ? await catalogue.get(resource, recordId) : null;
    const values = row ? catalogue.present(resource, row) : { is_active: true, price: "0.00", stock_quantity: 0, discount_type: "percentage", min_order_amount: "0.00" };
    if (isApiRequest(req)) return res.json({ [RESOURCES[resource].singular]: values });
    if (values.expires_at) values.expires_at = values.expires_at.toISOString().slice(0, 16);
    await renderForm(req, res, resource, recordId, values);
  };
}

function resourceSave(resource) {
  return async (req, res) => {
    const recordId = req.params.id ? id(req.params.id, RESOURCES[resource].singular) : null;
    if (recordId) await catalogue.get(resource, recordId);
    let savedId;
    try {
      const values = RESOURCES[resource].parse(req.body, !recordId);
      savedId = await catalogue.save(requestOwner(req), resource, recordId, values, req.body && req.body.revision);
    } catch (error) {
      if (isApiRequest(req) || !clientError(error)) throw error;
      return renderForm(req, res, resource, recordId, safeValues(req.body), [error.message], error.statusCode);
    }
    if (isApiRequest(req)) return res.status(recordId ? 200 : 201).json({ message: "Changes saved.", [RESOURCES[resource].singular]: catalogue.present(resource, await catalogue.get(resource, savedId)) });
    res.redirect(303, "/admin/" + resource + "/" + savedId + "/edit?notice=saved");
  };
}

async function updateStock(req, res) {
  const productId = id(req.params.id, "product");
  try {
    const body = req.body || {};
    await catalogue.setStock(requestOwner(req), productId, v.integer(body.stock_quantity, "Stock"), v.integer(body.expectedStock, "Previous stock"));
  } catch (error) {
    if (isApiRequest(req) || !clientError(error)) throw error;
    return res.status(error.statusCode).render("admin/action-error", page(req, "Review inventory", "inventory", { message: error.message, recoveryHref: "/admin/inventory", recoveryLabel: "Reload inventory" }));
  }
  if (isApiRequest(req)) return res.json({ message: "Inventory updated.", product: catalogue.present("products", await catalogue.get("products", productId)) });
  res.redirect(303, "/admin/inventory?" + new URLSearchParams({ q: (await catalogue.get("products", productId)).sku, notice: "stock-saved" }));
}

async function showOrders(req, res) {
  const filters = v.filters(req.query, "orders");
  const listing = await orders.list(filters);
  if (isApiRequest(req)) return res.json({ orders: listing });
  res.render("admin/orders", page(req, "Customer orders", "orders", {
    filters, listing, statuses: v.ORDER_STATUSES, paymentStatuses: v.PAYMENT_STATUSES, pageUrl: number => v.pageUrl("/admin/orders", filters, number)
  }));
}

async function showOrder(req, res, errors = [], status = 200) {
  const order = await orders.get(id(req.params.id, "order"));
  if (isApiRequest(req)) return res.json({ order });
  res.status(status).render("admin/order", page(req, "Order " + order.orderNumber, "orders", { order, errors }));
}

async function updateOrder(req, res) {
  const orderId = id(req.params.id, "order");
  try {
    const body = req.body || {};
    if (!v.ORDER_STATUSES.includes(body.status) || !v.ORDER_STATUSES.includes(body.expectedStatus)) throw new ShoppingError("Choose a valid order status and reload the current order before saving.");
    await orders.updateStatus(requestOwner(req), orderId, body.status, body.expectedStatus);
  } catch (error) {
    if (isApiRequest(req) || !clientError(error)) throw error;
    return showOrder(req, res, [error.message], error.statusCode);
  }
  if (isApiRequest(req)) return res.json({ message: "Order status updated.", order: await orders.get(orderId) });
  res.redirect(303, "/admin/orders/" + orderId + "?notice=status-saved");
}

// Express passes next as the third argument: do not pass showOrder directly with its optional error-list parameter.
const viewOrder = (req, res) => showOrder(req, res);

module.exports = { showDashboard, getSummary, resourceList, resourceForm, resourceSave, updateStock, showOrders, viewOrder, updateOrder };
