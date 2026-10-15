const { Address, sequelize } = require("../models");
const { Op } = require("sequelize");
const { lockUser } = require("./shoppingOwner");
const ShoppingError = require("../utils/ShoppingError");

const MAX_ADDRESSES = 20;

function list(userId, transaction) {
  return Address.findAll({ where: { user_id: userId }, order: [["is_default", "DESC"], ["id", "ASC"]], transaction });
}

async function get(userId, id, transaction) {
  const address = await Address.findOne({ where: { id, user_id: userId }, transaction });
  if (!address) throw new ShoppingError("That delivery address was not found.", 404);
  return address;
}

async function save(owner, id, values) {
  return sequelize.transaction(async transaction => {
    await lockUser(owner, transaction);
    const address = id ? await get(owner.userId, id, transaction) : null;
    const count = await Address.count({ where: { user_id: owner.userId }, transaction });
    if (!address && count >= MAX_ADDRESSES) throw new ShoppingError(`You can save at most ${MAX_ADDRESSES} addresses. Edit or remove an existing address.`, 409);
    const makeDefault = values.is_default || !count || (address && address.is_default);
    if (makeDefault) await Address.update({ is_default: false }, { where: { user_id: owner.userId, is_default: true, ...(address ? { id: { [Op.ne]: address.id } } : {}) }, transaction });
    const data = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value === "" ? null : value]));
    data.is_default = Boolean(makeDefault);
    return address ? address.update(data, { transaction }) : Address.create({ ...data, user_id: owner.userId }, { transaction });
  });
}

async function remove(owner, id) {
  return sequelize.transaction(async transaction => {
    await lockUser(owner, transaction);
    const address = await get(owner.userId, id, transaction);
    const wasDefault = address.is_default;
    await address.destroy({ transaction });
    if (wasDefault) {
      const next = await Address.findOne({ where: { user_id: owner.userId }, order: [["id", "ASC"]], transaction });
      if (next) await next.update({ is_default: true }, { transaction });
    }
  });
}

async function setDefault(owner, id) {
  return sequelize.transaction(async transaction => {
    await lockUser(owner, transaction);
    const address = await get(owner.userId, id, transaction);
    await Address.update({ is_default: false }, { where: { user_id: owner.userId, is_default: true, id: { [Op.ne]: address.id } }, transaction });
    await address.update({ is_default: true }, { transaction });
    return address;
  });
}

module.exports = { MAX_ADDRESSES, list, get, save, remove, setDefault };
