const express = require("express");
const { showHome } = require("../controllers/homeController");
const { showCatalogue, showProduct } = require("../controllers/productController");
const authRoutes = require("./authRoutes");
const { webRouter: adminRoutes } = require("./adminRoutes");
const shoppingRoutes = require("./shoppingRoutes");
const commerceRoutes = require("./commerceRoutes");
const { exposeCsrf } = require("../middleware/csrf");

const router = express.Router();

router.get("/", exposeCsrf, showHome);
router.get("/products", exposeCsrf, showCatalogue);
router.get("/products/:id", exposeCsrf, showProduct);
router.use(authRoutes);
router.use(shoppingRoutes);
router.use(commerceRoutes);
router.use("/admin", adminRoutes);

module.exports = router;
