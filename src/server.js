const app = require("./app");
const sequelize = require("./config/database");
const settings = require("./config/settings");
const databaseErrorMessage = require("./utils/databaseErrorMessage");

async function startServer() {
  try {
    // Start listening only after PostgreSQL is reachable.
    await sequelize.authenticate();
    console.log("PostgreSQL connection successful.");

    const server = app.listen(settings.port, "127.0.0.1", function () {
      console.log("ShopNow is running at http://localhost:" + settings.port);
    });

    server.on("error", async function (error) {
      if (error.code === "EADDRINUSE") {
        console.error("This port is already in use. Change PORT in .env.");
      } else {
        console.error("The HTTP server could not start.");
      }

      await sequelize.close();
      process.exitCode = 1;
    });

    function stopServer() {
      server.close(async function () {
        await sequelize.close();
        process.exitCode = 0;
      });
    }

    process.on("SIGINT", stopServer);
    process.on("SIGTERM", stopServer);
  } catch (error) {
    console.error("PostgreSQL connection failed.");
    console.error(databaseErrorMessage(error));
    console.error("Run npm run db:check after fixing the settings.");
    await sequelize.close();
    process.exitCode = 1;
  }
}

startServer();
