const { Op } = require("sequelize");
const { User } = require("../models");
const ShoppingError = require("../utils/ShoppingError");

async function lockAdmin(owner, transaction, customerId) {
  // Sort both account locks so admins managing one another's orders cannot invert the lock order.
  const users = await User.findAll({
    where: { id: { [Op.in]: [...new Set([owner.userId, customerId].filter(Boolean).map(String))] } },
    attributes: ["id", "role", "auth_version"], order: [["id", "ASC"]], transaction, lock: transaction.LOCK.UPDATE
  });
  const actor = users.find(user => String(user.id) === owner.userId);
  if (!actor || actor.auth_version !== owner.authVersion) throw new ShoppingError("Your account session has changed. Sign in again.", 401);
  if (actor.role !== "admin") throw new ShoppingError("Administrator access is required.", 403);
}

module.exports = { lockAdmin };
