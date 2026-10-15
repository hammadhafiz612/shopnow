const { sequelize } = require("../src/models");
const worker = require("../src/services/mailWorker");
const mail = require("../src/services/mailService");

async function run() {
  try {
    await sequelize.authenticate();
    const result = await worker.processBatch(20);
    console.log(result.configured ? `Messages processed: ${result.processed}; sent: ${result.sent}; previewed: ${result.previewed}; failed: ${result.failed}.` : "SMTP is not configured. Set MAIL_MODE=preview for local notification previews, or configure SMTP.");
    if (result.failed) process.exitCode = 1;
  } catch {
    console.error("Mail processing failed. Check the database and apply migrations."); process.exitCode = 1;
  } finally { mail.closeTransport(); await sequelize.close(); }
}
run();
