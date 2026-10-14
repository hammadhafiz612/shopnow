function notFound(req, res) {
  if (req.path === "/api" || req.path.startsWith("/api/")) {
    return res.status(404).json({ message: "Endpoint not found." });
  }

  res.status(404).render("error", {
    title: "Page not found | ShopNow",
    status: 404,
    message: "We could not find that page.",
    year: new Date().getFullYear()
  });
}

module.exports = notFound;
