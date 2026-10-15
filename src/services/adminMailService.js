const { MailMessage, sequelize } = require("../models");
const { lockAdmin } = require("./adminAccess");
const settings = require("../config/settings");
const { configured } = require("./mailWorker");
const ShoppingError = require("../utils/ShoppingError");

const STATUSES = ["pending", "sending", "sent", "previewed", "failed"];
const FIELDS = ["id", "kind", "recipient", "subject", "status", "attempts", "next_attempt_at", "completed_at", "last_error", "order_id", "preview_file", "created_at"];

async function list(status, page) {
  if (status && !STATUSES.includes(status)) throw new ShoppingError("Choose a valid email status.");
  const { rows, count } = await MailMessage.findAndCountAll({ attributes: FIELDS, where: status ? { status } : {}, order: [["created_at", "DESC"], ["id", "DESC"]], limit: 20, offset: (page - 1) * 20 });
  return { items: rows.map(row => row.toJSON()), total: count, page, pages: Math.max(1, Math.ceil(count / 20)), pageSize: 20, mode: settings.notificationMailMode, ready: configured(), automatic: settings.mailWorkerEnabled };
}

async function get(id) {
  const row = await MailMessage.findByPk(id);
  if (!row) throw new ShoppingError("That email notification was not found.", 404);
  return row;
}

async function retry(owner, id) {
  await sequelize.transaction(async transaction => {
    await lockAdmin(owner, transaction);
    const row = await MailMessage.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!row) throw new ShoppingError("That email notification was not found.", 404);
    if (row.status !== "failed") throw new ShoppingError("Only failed notifications can be queued for retry.", 409);
    await row.update({ status: "pending", attempts: 0, next_attempt_at: new Date(), lease_token: null, lease_until: null, last_error: null }, { transaction });
  });
}

module.exports = { STATUSES, list, get, retry };
