const { DataTypes: D } = require("sequelize");
const sequelize = require("../config/database");

const MailMessage = sequelize.define("MailMessage", {
  id: { type: D.UUID, primaryKey: true, allowNull: false, defaultValue: D.UUIDV4 },
  event_key: { type: D.STRING(160), allowNull: false, unique: true }, kind: { type: D.STRING(30), allowNull: false },
  user_id: { type: D.BIGINT, allowNull: true }, order_id: { type: D.BIGINT, allowNull: true },
  recipient: { type: D.STRING(254), allowNull: false }, subject: { type: D.STRING(200), allowNull: false },
  text_body: { type: D.TEXT, allowNull: false }, html_body: { type: D.TEXT, allowNull: false },
  status: { type: D.STRING(15), allowNull: false, defaultValue: "pending" }, attempts: { type: D.INTEGER, allowNull: false, defaultValue: 0 },
  next_attempt_at: { type: D.DATE, allowNull: true, defaultValue: D.NOW }, lease_until: { type: D.DATE, allowNull: true },
  lease_token: { type: D.UUID, allowNull: true }, completed_at: { type: D.DATE, allowNull: true },
  preview_file: { type: D.STRING(50), allowNull: true }, last_error: { type: D.STRING(200), allowNull: true }
}, { tableName: "mail_outbox", timestamps: true, createdAt: "created_at", updatedAt: "updated_at" });

module.exports = MailMessage;
