const express = require("express");
const admin = require("../controllers/adminController");
const { requireRole } = require("../middleware/auth");
const { exposeCsrf, verifyCsrf } = require("../middleware/csrf");
const images = require("../controllers/productImageController");
const { parseImage, imageLimiter } = require("../middleware/productImageUpload");
const emails = require("../controllers/adminMailController");

// Admin HTML pages, mounted at /admin.
const webRouter = express.Router();
webRouter.use((req, res, next) => {
  if (!req.currentUser && req.method !== "GET") return res.redirect(303, "/login?next=%2Fadmin");
  next();
});
webRouter.use(requireRole("admin"), exposeCsrf);
webRouter.get("/", admin.showDashboard);
for (const resource of ["categories", "products", "coupons"]) {
  webRouter.get("/" + resource, admin.resourceList(resource));
  webRouter.get("/" + resource + "/new", admin.resourceForm(resource));
  webRouter.get("/" + resource + "/:id/edit", admin.resourceForm(resource));
  webRouter.post("/" + resource, verifyCsrf, admin.resourceSave(resource));
  webRouter.post("/" + resource + "/:id/update", verifyCsrf, admin.resourceSave(resource));
}
webRouter.get("/inventory", admin.resourceList("inventory"));
webRouter.post("/inventory/:id", verifyCsrf, admin.updateStock);
webRouter.get("/orders", admin.showOrders);
webRouter.get("/orders/:id", admin.viewOrder);
webRouter.post("/orders/:id/status", verifyCsrf, admin.updateOrder);
webRouter.get("/products/:id/images", images.show);
webRouter.post("/products/:id/images", images.checkProduct, imageLimiter, parseImage, verifyCsrf, images.upload, images.error);
webRouter.post("/products/:id/images/:imageId/primary", verifyCsrf, images.change("primary"), images.error);
webRouter.post("/products/:id/images/:imageId/alt", verifyCsrf, images.change("alt"), images.error);
webRouter.post("/products/:id/images/:imageId/remove", verifyCsrf, images.change("remove"), images.error);
webRouter.get("/emails", emails.list);
webRouter.post("/emails/:messageId/retry", verifyCsrf, emails.retry);
webRouter.get("/emails/:messageId/preview", emails.preview);
webRouter.get("/emails/:messageId/download", emails.download);

// Admin JSON endpoints, mounted at /api/admin.
const apiRouter = express.Router();
apiRouter.use(requireRole("admin"));
apiRouter.get("/summary", admin.getSummary);
for (const resource of ["categories", "products", "coupons"]) {
  apiRouter.get("/" + resource, admin.resourceList(resource));
  apiRouter.get("/" + resource + "/:id", admin.resourceForm(resource));
  apiRouter.post("/" + resource, verifyCsrf, admin.resourceSave(resource));
  apiRouter.put("/" + resource + "/:id", verifyCsrf, admin.resourceSave(resource));
}
apiRouter.get("/inventory", admin.resourceList("inventory"));
apiRouter.put("/inventory/:id", verifyCsrf, admin.updateStock);
apiRouter.get("/orders", admin.showOrders);
apiRouter.get("/orders/:id", admin.viewOrder);
apiRouter.put("/orders/:id/status", verifyCsrf, admin.updateOrder);
apiRouter.get("/products/:id/images", images.show);
apiRouter.post("/products/:id/images", images.checkProduct, imageLimiter, parseImage, verifyCsrf, images.upload);
apiRouter.post("/products/:id/images/:imageId/primary", verifyCsrf, images.change("primary"));
apiRouter.patch("/products/:id/images/:imageId", verifyCsrf, images.change("alt"));
apiRouter.delete("/products/:id/images/:imageId", verifyCsrf, images.change("remove"));
apiRouter.get("/emails", emails.list);
apiRouter.post("/emails/:messageId/retry", verifyCsrf, emails.retry);

module.exports = { webRouter, apiRouter };
