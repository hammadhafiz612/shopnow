const express = require("express");
const admin = require("../controllers/adminController");
const { requireRole } = require("../middleware/auth");
const { verifyCsrf } = require("../middleware/csrf");
const images = require("../controllers/productImageController");
const { parseImage, imageLimiter } = require("../middleware/productImageUpload");
const emails = require("../controllers/adminMailController");

const router = express.Router();
router.use(requireRole("admin"));
router.get("/summary", admin.getSummary);
for (const resource of ["categories", "products", "coupons"]) {
  router.get("/" + resource, admin.resourceList(resource));
  router.get("/" + resource + "/:id", admin.resourceForm(resource));
  router.post("/" + resource, verifyCsrf, admin.resourceSave(resource));
  router.put("/" + resource + "/:id", verifyCsrf, admin.resourceSave(resource));
}
router.get("/inventory", admin.resourceList("inventory"));
router.put("/inventory/:id", verifyCsrf, admin.updateStock);
router.get("/orders", admin.showOrders);
router.get("/orders/:id", admin.viewOrder);
router.put("/orders/:id/status", verifyCsrf, admin.updateOrder);
router.get("/products/:id/images", images.show);
router.post("/products/:id/images", images.checkProduct, imageLimiter, parseImage, verifyCsrf, images.upload);
router.post("/products/:id/images/:imageId/primary", verifyCsrf, images.change("primary"));
router.patch("/products/:id/images/:imageId", verifyCsrf, images.change("alt"));
router.delete("/products/:id/images/:imageId", verifyCsrf, images.change("remove"));
router.get("/emails", emails.list);
router.post("/emails/:messageId/retry", verifyCsrf, emails.retry);

module.exports = router;
