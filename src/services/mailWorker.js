const { randomUUID } = require("node:crypto");
const { Op } = require("sequelize");
const { sequelize, MailMessage } = require("../models");
const settings = require("../config/settings");
const mail = require("./mailService");

const MAX_ATTEMPTS = 5;
const LEASE_MS = 120000;
const RETRY_MS = [10000, 60000, 300000, 900000];
const configured = () => settings.notificationMailMode === "preview" || mail.isMailConfigured();

async function claim() {
  return sequelize.transaction(async transaction => {
    const now = new Date();
    const row = await MailMessage.findOne({
      where: { [Op.or]: [
        { status: { [Op.in]: ["pending", "failed"] }, next_attempt_at: { [Op.lte]: now }, attempts: { [Op.lt]: MAX_ATTEMPTS } },
        { status: "sending", lease_until: { [Op.lte]: now } }
      ] }, order: [["created_at", "ASC"], ["id", "ASC"]], transaction, lock: transaction.LOCK.UPDATE, skipLocked: true
    });
    if (!row) return null;
    if (row.attempts >= MAX_ATTEMPTS) {
      await row.update({ status: "failed", lease_until: null, lease_token: null, next_attempt_at: null, last_error: "Delivery was interrupted. Review and retry this message." }, { transaction });
      return { exhausted: true };
    }
    await row.update({ status: "sending", attempts: row.attempts + 1, lease_token: randomUUID(), lease_until: new Date(Date.now() + LEASE_MS), next_attempt_at: null }, { transaction });
    return row.toJSON();
  });
}

function safeFailure(error) {
  if (error.code === "EAUTH") return "SMTP authentication failed. Check the SMTP username and app password.";
  if (["ECONNECTION", "ECONNREFUSED", "ETIMEDOUT", "EDNS", "ESOCKET"].includes(error.code)) return "Could not connect to the email server. Check SMTP host, port and service availability.";
  if (error.code === "EENVELOPE") return "The email server rejected the sender or recipient address.";
  return "Email delivery failed. Check the mail settings and retry.";
}

async function processBatch(limit = 5) {
  const result = { processed: 0, sent: 0, previewed: 0, failed: 0, configured: configured() };
  if (!result.configured) return result;
  for (let index = 0; index < limit; index++) {
    const job = await claim();
    if (!job) break;
    if (job.exhausted) { result.failed++; continue; }
    result.processed++;
    const where = { id: job.id, status: "sending", lease_token: job.lease_token };
    let delivery;
    try {
      delivery = await mail.sendNotification(job);
    } catch (error) {
      await MailMessage.update({ status: "failed", lease_until: null, lease_token: null, last_error: safeFailure(error), next_attempt_at: job.attempts >= MAX_ATTEMPTS ? null : new Date(Date.now() + RETRY_MS[job.attempts - 1]) }, { where });
      result.failed++;
      continue;
    }
    // Keep transport delivery outside a database transaction. A crash after SMTP acceptance can cause a replay.
    await MailMessage.update({ ...delivery, completed_at: new Date(), lease_until: null, lease_token: null, next_attempt_at: null, last_error: null }, { where });
    result[delivery.status]++;
  }
  return result;
}

function startMailWorker() {
  let stopping = false, running = null;
  const tick = () => {
    if (stopping || running || !configured()) return;
    running = processBatch().catch(() => { console.error("Notification worker paused after a database or delivery-state error."); }).finally(() => { running = null; });
  };
  if (!settings.mailWorkerEnabled) return async () => {};
  tick();
  const timer = setInterval(tick, 10000);
  timer.unref();
  return async () => { stopping = true; clearInterval(timer); if (running) await running; };
}

module.exports = { MAX_ATTEMPTS, configured, processBatch, startMailWorker };
