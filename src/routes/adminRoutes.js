const express = require("express");
const admin = require("../controllers/adminController");
const { requireRole } = require("../middleware/auth");
const { exposeCsrf, verifyCsrf } = require("../middleware/csrf");
const images = require("../controllers/productImageController");
const { parseImage, imageLimiter } = require("../middleware/productImageUpload");
const emails = require("../controllers/adminMailController");

const router = express.Router();
router.use((req, res, next) => {
  if (!req.currentUser && req.method !== "GET") return res.redirect(303, "/login?next=%2Fadmin");
  next();
});
router.use(requireRole("admin"), exposeCsrf);
router.get("/", admin.showDashboard);
for (const resource of ["categories", "products", "coupons"]) {
  router.get("/" + resource, admin.resourceList(resource));
  router.get("/" + resource + "/new", admin.resourceForm(resource));
  router.get("/" + resource + "/:id/edit", admin.resourceForm(resource));
  router.post("/" + resource, verifyCsrf, admin.resourceSave(resource));
  router.post("/" + resource + "/:id/update", verifyCsrf, admin.resourceSave(resource));
}
router.get("/inventory", admin.resourceList("inventory"));
router.post("/inventory/:id", verifyCsrf, admin.updateStock);
router.get("/orders", admin.showOrders);
router.get("/orders/:id", admin.viewOrder);
router.post("/orders/:id/status", verifyCsrf, admin.updateOrder);
router.get("/products/:id/images", images.show);
router.post("/products/:id/images", images.checkProduct, imageLimiter, parseImage, verifyCsrf, images.upload, images.error);
router.post("/products/:id/images/:imageId/primary", verifyCsrf, images.change("primary"), images.error);
router.post("/products/:id/images/:imageId/alt", verifyCsrf, images.change("alt"), images.error);
router.post("/products/:id/images/:imageId/remove", verifyCsrf, images.change("remove"), images.error);
router.get("/emails", emails.list);
router.post("/emails/:messageId/retry", verifyCsrf, emails.retry);
router.get("/emails/:messageId/preview", emails.preview);
router.get("/emails/:messageId/download", emails.download);

module.exports = router;
