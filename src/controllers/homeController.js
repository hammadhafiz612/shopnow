const catalogue = require("../services/catalogueService");
const { catalogueUrl } = require("../utils/catalogueQuery");

async function showHome(req, res) {
  const [categories, result] = await Promise.all([
    catalogue.listCategories(),
    catalogue.getCatalogue({ q: "", category: "", minPrice: "", maxPrice: "", sort: "newest", page: 1 }, 8)
  ]);
  res.render("home", {
    title: "ShopNow | Everyday finds",
    activeNav: "home",
    year: new Date().getFullYear(),
    categories, products: result.products, totalProducts: result.pagination.total,
    categoryUrl: slug => catalogueUrl({ category: slug })
  });
}

module.exports = { showHome };
