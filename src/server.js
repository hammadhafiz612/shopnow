const sequelize = require("./config/database");
const settings = require("./config/settings");
const databaseErrorMessage = require("./utils/databaseErrorMessage");
const { closeSessionStore } = require("./config/session");
let stopMailWorker = async () => {};

async function closeResources() {
  await stopMailWorker();
  require("./services/mailService").closeTransport();
  await closeSessionStore();
  await sequelize.close();
}

async function startServer() {
  try {
    // Start listening only after PostgreSQL is reachable.
    await sequelize.authenticate();
    await sequelize.query('SELECT sid FROM "app_sessions" LIMIT 0');
    await sequelize.query('SELECT auth_version FROM "users" LIMIT 0');
    await sequelize.query('SELECT session_id FROM "carts" LIMIT 0');
    await sequelize.query('SELECT id FROM "mail_outbox" LIMIT 0');
    console.log("PostgreSQL connection successful.");

    const app = require("./app");

    const server = app.listen(settings.port, "127.0.0.1", function () {
      console.log("ShopNow is running at http://localhost:" + settings.port);
      stopMailWorker = require("./services/mailWorker").startMailWorker();
    });

    server.on("error", async function (error) {
      if (error.code === "EADDRINUSE") {
        console.error("This port is already in use. Change PORT in .env.");
      } else {
        console.error("The HTTP server could not start.");
      }

      await closeResources();
      process.exitCode = 1;
    });

    function stopServer() {
      server.close(async function () {
        await closeResources();
        process.exitCode = 0;
      });
    }

    process.on("SIGINT", stopServer);
    process.on("SIGTERM", stopServer);
  } catch (error) {
    if (error.message.startsWith("SESSION_SECRET")) {
      console.error(error.message);
    } else if (["42P01", "42703"].includes(error.original && error.original.code)) {
      console.error("Project tables are not ready. Run npm.cmd run db:migrate first.");
    } else {
      console.error("PostgreSQL connection failed.");
      console.error(databaseErrorMessage(error));
      console.error("Run npm.cmd run db:check after fixing the settings.");
    }
    await closeResources();
    process.exitCode = 1;
  }
}

startServer();
