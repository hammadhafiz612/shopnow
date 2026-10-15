const { escape } = require("validator");
const { MailMessage, User, OrderItem, OrderAddress } = require("../models");
const settings = require("../config/settings");
const formatPrice = require("../utils/formatPrice");

function siteLink(path) {
  const url = new URL(settings.appUrl);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("APP_URL must be an HTTP or HTTPS site URL.");
  return new URL(path, url).toString();
}

function htmlBody(title, lines, link) {
  return '<!doctype html><html lang="en"><body style="font-family:Arial,sans-serif;background:#f7f8f3;color:#16352d;padding:24px"><main style="max-width:640px;margin:auto;background:white;padding:28px;border-radius:12px"><p><strong>ShopNow.</strong></p><h1 style="font-size:24px">'
    + escape(title) + '</h1>' + lines.map(line => '<p style="line-height:1.7;white-space:pre-line">' + escape(line) + '</p>').join("")
    + '<p><a href="' + escape(link) + '">Open ShopNow</a></p><p style="font-size:12px">ShopNow is a demo store. Payments are simulated.</p></main></body></html>';
}

async function enqueue(values, transaction) {
  const [row] = await MailMessage.findOrCreate({ where: { event_key: values.event_key }, defaults: values, transaction });
  return row;
}

async function welcome(user, transaction) {
  const lines = [`Hello ${user.full_name},`, "Your ShopNow account is ready. You can save products, manage delivery addresses and follow your orders."];
  const link = siteLink("/account");
  return enqueue({ event_key: "welcome:" + user.id, kind: "welcome", user_id: user.id, recipient: user.email, subject: "Welcome to ShopNow", text_body: lines.join("\n\n") + "\n\n" + link, html_body: htmlBody("Welcome to ShopNow", lines, link) }, transaction);
}

async function orderMessage(order, eventKey, kind, transaction) {
  const user = await User.findByPk(order.user_id, { attributes: ["id", "full_name", "email"], transaction });
  const items = await OrderItem.findAll({ where: { order_id: order.id }, order: [["id", "ASC"]], transaction });
  const address = await OrderAddress.findByPk(order.id, { transaction });
  const title = kind === "order_confirmation" ? "Your order is confirmed" : "Your order has an update";
  const lines = [
    `Hello ${user.full_name},`, `Order ${order.order_number}\nOrder status: ${order.order_status}\nPayment status: ${order.payment_status}`,
    items.map(item => `${item.product_name} — ${item.quantity} × ${formatPrice(item.unit_price)} = ${formatPrice(item.line_total)}`).join("\n"),
    `Subtotal: ${formatPrice(order.subtotal)}\nDiscount: ${formatPrice(order.discount_amount)}\nTotal: ${formatPrice(order.total_amount)}`
  ];
  if (address) lines.push("Delivery address:\n" + [address.recipient_name, address.line1, address.line2, [address.city, address.state, address.postal_code].filter(Boolean).join(", "), address.country_code].filter(Boolean).join("\n"));
  if (order.order_status === "cancelled") lines.push("This order was cancelled. Stock and coupon usage have been restored. Earlier demo payments remain in your order history.");
  else if (order.payment_status === "failed") lines.push("The demo payment failed. You can retry or cancel this unpaid order from your account.");
  else if (order.payment_status !== "paid") lines.push("Complete the simulated payment from your order page. No real money will be charged.");
  const link = siteLink("/orders/" + order.id);
  return enqueue({ event_key: eventKey, kind, user_id: user.id, order_id: order.id, recipient: user.email, subject: `${title} — ${order.order_number}`, text_body: lines.join("\n\n") + "\n\n" + link, html_body: htmlBody(title, lines, link) }, transaction);
}

module.exports = { welcome, orderMessage };
