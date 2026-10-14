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

module.exports = {
  port: readPort(process.env.PORT, 3000, "PORT"),
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
