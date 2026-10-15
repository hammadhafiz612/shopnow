const { QueryTypes } = require("sequelize");
const { User, sequelize } = require("../models");
const ShoppingError = require("../utils/ShoppingError");

async function lockUser(owner, transaction) {
  const user = await User.findByPk(owner.userId, {
    attributes: ["id", "auth_version"], transaction, lock: transaction.LOCK.UPDATE
  });
  if (!user || user.auth_version !== owner.authVersion) {
    throw new ShoppingError("Your account session has changed. Sign in again to continue.", 401);
  }
}

async function lockGuestSession(sessionId, transaction) {
  const rows = await sequelize.query(
    'SELECT sid, sess FROM app_sessions WHERE sid = :sid AND expire >= CURRENT_TIMESTAMP FOR UPDATE',
    { replacements: { sid: sessionId }, type: QueryTypes.SELECT, transaction }
  );
  if (!rows.length) throw new ShoppingError("Your shopping session has expired. Refresh the page and try again.", 409);
  return rows[0].sess;
}

async function lockOwner(owner, transaction) {
  if (owner.userId) return lockUser(owner, transaction);
  const session = await lockGuestSession(owner.sessionId, transaction);
  if (session.cartMergedTo) throw new ShoppingError("Your guest cart has already been saved. Refresh the page before continuing.", 409);
}

function cartWhere(owner) {
  return owner.userId ? { user_id: owner.userId } : { session_id: owner.sessionId };
}

module.exports = { lockUser, lockGuestSession, lockOwner, cartWhere };
