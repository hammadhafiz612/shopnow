const fs = require("node:fs/promises");
const path = require("node:path");
const { isUUID } = require("validator");
const service = require("../services/adminMailService");
const storage = require("../config/storage");
const { text, integer, pageUrl } = require("../utils/adminValidation");
const { requestOwner } = require("../utils/shoppingValidation");
const { isApiRequest } = require("../utils/authSession");
const ShoppingError = require("../utils/ShoppingError");

function messageId(value) {
  if (typeof value !== "string" || !isUUID(value, "4")) throw new ShoppingError("Choose a valid email notification.");
  return value;
}
const page = (title, extra) => ({ title: title + " | ShopNow admin", activeNav: "admin", adminSection: "emails", adminNotice: "", year: new Date().getFullYear(), ...extra });

async function list(req, res) {
  const status = text(req.query.status, "Email status", 15, true);
  const selectedPage = req.query.page === undefined ? 1 : integer(req.query.page, "Page", 1);
  if (selectedPage > 1000000) throw new ShoppingError("Choose a smaller page number.");
  const listing = await service.list(status, selectedPage);
  if (isApiRequest(req)) return res.json({ notifications: listing });
  res.render("admin/emails", page("Email notifications", { listing, status, statuses: service.STATUSES, pageUrl: number => pageUrl("/admin/emails", { status }, number), adminNotice: req.query.notice === "mail-retry" ? "Notification queued for retry." : "" }));
}

async function retry(req, res) {
  await service.retry(requestOwner(req), messageId(req.params.messageId));
  if (isApiRequest(req)) return res.json({ message: "Notification queued for retry." });
  res.redirect(303, "/admin/emails?notice=mail-retry");
}

async function preview(req, res) {
  const notification = await service.get(messageId(req.params.messageId));
  if (notification.status !== "previewed") throw new ShoppingError("Only locally previewed notifications are available here.", 404);
  res.render("admin/email-preview", page("Local email preview", { notification }));
}

async function download(req, res) {
  const notification = await service.get(messageId(req.params.messageId));
  if (notification.status !== "previewed" || !storage.previewFilename.test(notification.preview_file || "")) throw new ShoppingError("This local email file is not available.", 404);
  const file = path.join(storage.mailPreviews, notification.preview_file);
  try { await fs.access(file); } catch { throw new ShoppingError("This local email file is missing. The saved text preview is still available.", 404); }
  res.download(file, notification.preview_file, { headers: { "Content-Type": "message/rfc822" } });
}

module.exports = { list, retry, preview, download };
