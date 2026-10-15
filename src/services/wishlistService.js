const { Wishlist, sequelize } = require("../models");
const { lockUser } = require("./shoppingOwner");
const catalogue = require("./catalogueService");
const { MAX_WISHLIST_ITEMS } = require("../utils/shoppingValidation");
const ShoppingError = require("../utils/ShoppingError");

async function add(owner, id) {
  return sequelize.transaction(async transaction => {
    await lockUser(owner, transaction);
    const existing = await Wishlist.findOne({ where: { user_id: owner.userId, product_id: id }, transaction });
    if (existing) return;
    const [product] = await catalogue.getShoppingProducts([id], transaction);
    if (!product || !product.available) throw new ShoppingError("That product is not available.", 404);
    if (await Wishlist.count({ where: { user_id: owner.userId }, transaction }) >= MAX_WISHLIST_ITEMS) {
      throw new ShoppingError(`Your wishlist can hold at most ${MAX_WISHLIST_ITEMS} products.`, 409);
    }
    await Wishlist.create({ user_id: owner.userId, product_id: id }, { transaction });
  });
}

async function remove(owner, id) {
  return sequelize.transaction(async transaction => {
    await lockUser(owner, transaction);
    await Wishlist.destroy({ where: { user_id: owner.userId, product_id: id }, transaction });
  });
}

async function snapshot(userId) {
  const rows = await Wishlist.findAll({ where: { user_id: userId }, order: [["id", "DESC"]] });
  const products = await catalogue.getShoppingProducts(rows.map(row => String(row.product_id)));
  const byId = new Map(products.map(product => [product.id, product]));
  const items = rows.map(row => byId.get(String(row.product_id))).filter(Boolean);
  return { items, count: items.length, maxItems: MAX_WISHLIST_ITEMS };
}

function count(userId) {
  return Wishlist.count({ where: { user_id: userId } });
}

module.exports = { add, remove, snapshot, count };
