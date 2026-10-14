function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let status = 500;
  let message = "Something went wrong. Please try again.";

  if (error.type === "entity.parse.failed") {
    status = 400;
    message = "The request contains invalid JSON.";
  } else if (error.type === "entity.too.large") {
    status = 413;
    message = "The request is too large.";
  }

  // Log the error type, not request bodies, passwords or connection strings.
  console.error("Request failed:", error.name || "Error");

  if (req.path === "/api" || req.path.startsWith("/api/")) {
    return res.status(status).json({ message });
  }

  res.status(status).render("error", {
    title: "Request error | ShopNow",
    status,
    message,
    year: new Date().getFullYear()
  });
}

module.exports = errorHandler;
