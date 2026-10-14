const path = require("node:path");
const express = require("express");
const helmet = require("helmet");
const webRoutes = require("./routes/webRoutes");
const apiRoutes = require("./routes/apiRoutes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.disable("x-powered-by");
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
app.use("/vendor/bootstrap", express.static(
  path.join(__dirname, "../node_modules/bootstrap/dist/css")
));

app.use("/", webRoutes);
app.use("/api", apiRoutes);

// Keep the 404 handler and error handler after all routes.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
