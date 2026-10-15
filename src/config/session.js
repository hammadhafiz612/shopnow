const session = require("express-session");
const PgSessionStore = require("connect-pg-simple")(session);
const { Pool } = require("pg");
const settings = require("./settings");

const COOKIE_NAME = "shopnow.sid";
const cookieOptions = { path: "/", httpOnly: true, sameSite: "lax", secure: settings.isProduction };
const pool = new Pool({
  host: settings.database.host, port: settings.database.port,
  database: settings.database.database, user: settings.database.username,
  password: settings.database.password, max: 5,
  connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000
});
pool.on("error", () => console.error("Session database connection failed."));

const store = new PgSessionStore({
  pool, tableName: "app_sessions", createTableIfMissing: false,
  pruneSessionInterval: 900,
  errorLog: () => console.error("Session storage failed.")
});

function createSessionMiddleware() {
  if (Buffer.byteLength(settings.sessionSecret, "utf8") < 32) {
    throw new Error("SESSION_SECRET is missing or too short. Run npm.cmd run auth:setup first.");
  }
  return session({
    name: COOKIE_NAME, secret: settings.sessionSecret, store,
    resave: false, saveUninitialized: false, rolling: true,
    cookie: { ...cookieOptions, maxAge: 30 * 60 * 1000 }
  });
}

async function closeSessionStore() {
  await store.close();
  await pool.end();
}

module.exports = { COOKIE_NAME, cookieOptions, createSessionMiddleware, closeSessionStore };
