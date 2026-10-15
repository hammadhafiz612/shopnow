const catalogue = require("../services/catalogueService");
const { PAGE_SIZE, SORT_OPTIONS, parseCatalogueQuery, catalogueUrl, paginationPages, isProductId } = require("../utils/catalogueQuery");

async function showCatalogue(req, res) {
  const { filters, errors } = parseCatalogueQuery(req.query);
  const [categories, result] = await Promise.all([
    catalogue.listCategories(),
    errors.length ? Promise.resolve({
      products: [], pagination: { page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0, from: 0, to: 0 }
    }) : catalogue.getCatalogue(filters)
  ]);

  if (!errors.length && result.pagination.page !== filters.page) {
    return res.redirect(catalogueUrl(filters, { page: result.pagination.page }));
  }

  res.status(errors.length ? 400 : 200).render("products/index", {
    title: "Browse products | ShopNow", activeNav: "products", year: new Date().getFullYear(),
    categories, filters, errors, ...result, sortOptions: SORT_OPTIONS,
    pageNumbers: paginationPages(result.pagination.page, result.pagination.totalPages),
    pageUrl: page => catalogueUrl(filters, { page })
  });
}

async function showProduct(req, res) {
  const product = isProductId(req.params.id) ? await catalogue.getProduct(req.params.id) : null;
  if (!product) {
    return res.status(404).render("error", {
      title: "Product not found | ShopNow", status: 404,
      message: "This product is unavailable. Browse the catalogue to find something else.",
      year: new Date().getFullYear()
    });
  }
  res.render("products/show", {
    title: `${product.name} | ShopNow`, activeNav: "products", year: new Date().getFullYear(),
    product, categoryUrl: catalogueUrl({ category: product.category.slug })
  });
}

async function listProductsApi(req, res) {
  const { filters, errors } = parseCatalogueQuery(req.query);
  if (errors.length) return res.status(400).json({ message: "Please check the catalogue filters.", errors });
  const result = await catalogue.getCatalogue(filters);
  res.json({ ...result, filters: { ...filters, page: result.pagination.page } });
}

async function getProductApi(req, res) {
  const product = isProductId(req.params.id) ? await catalogue.getProduct(req.params.id) : null;
  if (!product) return res.status(404).json({ message: "Product not found." });
  res.json({ product });
}

module.exports = { showCatalogue, showProduct, listProductsApi, getProductApi };
