const path = require("node:path");

// Load .env from the project root, even when a script runs from another folder.
require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
  quiet: true
});

function readPort(value, defaultPort, name) {
  const port = Number(value || defaultPort);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(name + " must be a number between 1 and 65535.");
  }

  return port;
}

const port = readPort(process.env.PORT, 3000, "PORT");
const notificationMailMode = process.env.MAIL_MODE || "smtp";
if (!["smtp", "preview"].includes(notificationMailMode)) throw new Error("MAIL_MODE must be smtp or preview.");

module.exports = {
  port,
  isProduction: process.env.NODE_ENV === "production",
  trustProxy: process.env.TRUST_PROXY === "1",
  sessionSecret: process.env.SESSION_SECRET || "",
  appUrl: process.env.APP_URL || `http://localhost:${port}`,
  notificationMailMode,
  mailWorkerEnabled: process.env.MAIL_WORKER !== "0",
  mail: {
    host: process.env.SMTP_HOST || "",
    port: readPort(process.env.SMTP_PORT, 587, "SMTP_PORT"),
    secure: process.env.SMTP_SECURE === "true",
    username: process.env.SMTP_USER || "",
    password: process.env.SMTP_PASSWORD || "",
    from: process.env.MAIL_FROM || ""
  },
  database: {
    database: process.env.DB_NAME || "shopnow_db",
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    host: process.env.DB_HOST || "127.0.0.1",
    port: readPort(process.env.DB_PORT, 5432, "DB_PORT"),
    dialect: "postgres",
    logging: false,
    dialectOptions: {
      connectionTimeoutMillis: 5000
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 10000,
      idle: 10000
    }
  }
};
