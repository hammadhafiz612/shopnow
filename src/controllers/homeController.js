function showHome(req, res) {
  res.render("home", {
    title: "ShopNow",
    year: new Date().getFullYear()
  });
}

module.exports = { showHome };
