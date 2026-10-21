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

// Configure the Express application in the same file as server startup.
function createApp() {
  const path = require("node:path");
  const express = require("express");
  const helmet = require("helmet");
  const webRoutes = require("./routes/webRoutes");
  const apiRoutes = require("./routes/apiRoutes");
  const notFound = require("./middleware/notFound");
  const errorHandler = require("./middleware/errorHandler");
  const settings = require("./config/settings");
  const { createSessionMiddleware } = require("./config/session");
  const { loadCurrentUser } = require("./middleware/auth");
  const { shoppingContext } = require("./middleware/shoppingContext");
  const storage = require("./config/storage");

  const app = express();

  app.disable("x-powered-by");
  if (settings.trustProxy) app.set("trust proxy", 1);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        // The local development server uses HTTP.
        "upgrade-insecure-requests": null
      }
    }
  }));

  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));

  app.use(express.json({ limit: "10kb" }));
  app.use(express.urlencoded({ extended: false, limit: "10kb" }));

  app.use(express.static(path.join(__dirname, "../public")));
  app.use("/uploads/products", (req, res, next) => {
    if (!storage.imageFilename.test(req.path.slice(1))) return res.sendStatus(404);
    next();
  }, express.static(storage.productImages, { index: false, dotfiles: "deny", maxAge: "1d", immutable: true, setHeaders(res) { res.set("Content-Type", "image/webp"); res.set("X-Content-Type-Options", "nosniff"); } }));
  app.use("/vendor/bootstrap", express.static(
    path.join(__dirname, "../node_modules/bootstrap/dist/css")
  ));

  app.use(createSessionMiddleware());
  app.use(loadCurrentUser);
  app.use(shoppingContext);

  app.use("/", webRoutes);
  app.use("/api", apiRoutes);

  // Keep the 404 handler and error handler after all routes.
  app.use(notFound);
  app.use(errorHandler);

  return app;
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

    const app = createApp();

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
