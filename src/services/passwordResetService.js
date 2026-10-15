const { randomBytes, createHash } = require("node:crypto");
const bcrypt = require("bcrypt");
const { Op } = require("sequelize");
const { User, PasswordResetToken, sequelize } = require("../models");
const { PASSWORD_COST } = require("./authService");
const mail = require("./mailService");

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

async function findUsableToken(token, transaction) {
  return PasswordResetToken.findOne({
    where: { token_hash: tokenHash(token), used_at: null, expires_at: { [Op.gt]: new Date() } },
    ...(transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {})
  });
}

async function requestReset(email) {
  if (!mail.isMailConfigured()) {
    console.error("Password reset email could not be sent: configure SMTP settings.");
    return;
  }
  const user = await User.findOne({ where: { email }, attributes: ["id", "email"] });
  if (!user) return;
  const token = randomBytes(32).toString("hex");
  const savedToken = await sequelize.transaction(async transaction => {
    // Lock the account before its tokens; resets use the same lock order.
    await User.findByPk(user.id, { transaction, lock: transaction.LOCK.UPDATE });
    await PasswordResetToken.update({ used_at: new Date() }, {
      where: { user_id: user.id, used_at: null }, transaction
    });
    return PasswordResetToken.create({
      user_id: user.id, token_hash: tokenHash(token), expires_at: new Date(Date.now() + 15 * 60 * 1000)
    }, { transaction });
  });
  try {
    await mail.sendResetEmail(user.email, token);
  } catch (error) {
    await PasswordResetToken.destroy({ where: { id: savedToken.id } });
    // Never log reset links, tokens, SMTP credentials or recipient details.
    console.error("Password reset email could not be sent.");
  }
}

async function isUsableToken(token) {
  return Boolean(await findUsableToken(token));
}

async function resetPassword(token, password) {
  const initial = await findUsableToken(token);
  if (!initial) return false;
  const passwordHash = await bcrypt.hash(password, PASSWORD_COST);
  return sequelize.transaction(async transaction => {
    const user = await User.findByPk(initial.user_id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user) return false;
    const reset = await findUsableToken(token, transaction);
    if (!reset) return false;
    await user.update({ password_hash: passwordHash, auth_version: user.auth_version + 1 }, { transaction });
    await PasswordResetToken.update({ used_at: new Date() }, {
      where: { user_id: user.id, used_at: null }, transaction
    });
    return true;
  });
}

module.exports = { requestReset, isUsableToken, resetPassword };
