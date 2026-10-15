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

module.exports = app;
