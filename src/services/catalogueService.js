const { Op } = require("sequelize");
const { Category, Product, ProductImage } = require("../models");
const { PAGE_SIZE } = require("../utils/catalogueQuery");
const formatPrice = require("../utils/formatPrice");

const PRODUCT_FIELDS = ["id", "category_id", "sku", "name", "description", "price", "stock_quantity", "created_at"];
const SORT_ORDERS = {
  newest: [["created_at", "DESC"], ["id", "DESC"]],
  price_asc: [["price", "ASC"], ["id", "ASC"]],
  price_desc: [["price", "DESC"], ["id", "DESC"]]
};

function categoryInclude(slug = "") {
  return {
    model: Category, as: "category", attributes: ["id", "name", "slug"],
    required: true, where: { is_active: true, ...(slug ? { slug } : {}) }
  };
}

function imageInclude() {
  return {
    model: ProductImage, as: "images", separate: true,
    attributes: ["id", "product_id", "file_path", "alt_text", "sort_order", "is_primary"],
    order: [["is_primary", "DESC"], ["sort_order", "ASC"], ["id", "ASC"]]
  };
}

function presentProduct(model) {
  const row = model.get({ plain: true });
  const images = row.images
    .filter(image => /^\/(?:images|uploads)\/[a-zA-Z0-9/_.-]+$/.test(image.file_path))
    .map(image => ({ id: String(image.id), src: image.file_path, alt: image.alt_text || row.name }));
  return {
    id: String(row.id), sku: row.sku, name: row.name, description: row.description,
    price: String(row.price), priceLabel: formatPrice(row.price),
    stock_quantity: row.stock_quantity, inStock: row.stock_quantity > 0,
    category: { id: String(row.category.id), name: row.category.name, slug: row.category.slug },
    images,
    primaryImage: images[0] || { src: "/images/product-placeholder.svg", alt: row.name }
  };
}

async function listCategories() {
  const categories = await Category.findAll({
    attributes: ["id", "name", "slug"], where: { is_active: true },
    order: [["name", "ASC"], ["id", "ASC"]]
  });
  return categories.map(category => ({ id: String(category.id), name: category.name, slug: category.slug }));
}

async function getCatalogue(filters, pageSize = PAGE_SIZE) {
  const where = { is_active: true };
  if (filters.q) {
    // Treat %, _ and backslash as literal search text rather than SQL wildcards.
    const pattern = "%" + filters.q.replace(/[\\%_]/g, "\\$&") + "%";
    where[Op.or] = [{ name: { [Op.iLike]: pattern } }, { description: { [Op.iLike]: pattern } }];
  }
  if (filters.minPrice || filters.maxPrice) {
    where.price = {
      ...(filters.minPrice ? { [Op.gte]: filters.minPrice } : {}),
      ...(filters.maxPrice ? { [Op.lte]: filters.maxPrice } : {})
    };
  }

  // Count only the belongs-to category join. Image rows cannot inflate the count.
  const total = await Product.count({ where, include: [categoryInclude(filters.category)] });
  const totalPages = Math.ceil(total / pageSize);
  const page = Math.min(filters.page, Math.max(totalPages, 1));
  const offset = (page - 1) * pageSize;
  const products = total ? await Product.findAll({
    attributes: PRODUCT_FIELDS, where,
    include: [categoryInclude(filters.category), imageInclude()],
    order: SORT_ORDERS[filters.sort], limit: pageSize, offset
  }) : [];

  return {
    products: products.map(presentProduct),
    pagination: { page, pageSize, total, totalPages, from: total ? offset + 1 : 0, to: offset + products.length }
  };
}

async function getProduct(id) {
  const product = await Product.findOne({
    attributes: PRODUCT_FIELDS, where: { id, is_active: true },
    include: [categoryInclude(), imageInclude()]
  });
  return product ? presentProduct(product) : null;
}

async function getShoppingProducts(ids, transaction) {
  if (!ids.length) return [];
  const products = await Product.findAll({
    attributes: [...PRODUCT_FIELDS, "is_active"], where: { id: { [Op.in]: ids } }, transaction,
    include: [
      { model: Category, as: "category", attributes: ["id", "name", "slug", "is_active"], required: true },
      imageInclude()
    ]
  });
  return products.map(product => ({
    ...presentProduct(product), available: product.is_active && product.category.is_active
  }));
}

module.exports = { listCategories, getCatalogue, getProduct, getShoppingProducts };
