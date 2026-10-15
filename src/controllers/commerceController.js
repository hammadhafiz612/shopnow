const { randomUUID } = require("node:crypto");
const addresses = require("../services/addressService");
const orders = require("../services/orderService");
const payments = require("../services/paymentService");
const validation = require("../utils/checkoutValidation");
const { requestOwner } = require("../utils/shoppingValidation");
const { isApiRequest } = require("../utils/authSession");
const ShoppingError = require("../utils/ShoppingError");

const pageData = (title, extra = {}) => ({ title: title + " | ShopNow", activeNav: "account", year: new Date().getFullYear(), ...extra });

async function showAddresses(req, res) {
  const items = await addresses.list(req.currentUser.id);
  if (isApiRequest(req)) return res.json({ addresses: items, maximum: addresses.MAX_ADDRESSES });
  res.render("addresses/index", pageData("Delivery addresses", { addresses: items, maximum: addresses.MAX_ADDRESSES }));
}

async function showAddressForm(req, res) {
  const id = req.params.id ? validation.id(req.params.id, "address") : null;
  const values = id ? (await addresses.get(req.currentUser.id, id)).toJSON() : { country_code: "PK", is_default: false };
  res.render("addresses/form", pageData(id ? "Edit delivery address" : "New delivery address", { values, id, errors: [], next: validation.checkoutNext(req.query.next) }));
}

async function saveAddress(req, res) {
  const id = req.params.id ? validation.id(req.params.id, "address") : null;
  if (id) await addresses.get(req.currentUser.id, id);
  const { values, errors } = validation.addressInput(req.body);
  const next = validation.checkoutNext(req.body && req.body.next);
  const renderErrors = (messages, status = 400) => {
    if (isApiRequest(req)) return res.status(status).json({ message: messages[0], errors: messages });
    return res.status(status).render("addresses/form", pageData(id ? "Edit delivery address" : "New delivery address", { values, id, errors: messages, next }));
  };
  if (errors.length) return renderErrors(errors);
  let address;
  try { address = await addresses.save(requestOwner(req), id, values); } catch (error) {
    if (error instanceof ShoppingError && [400, 409].includes(error.statusCode)) return renderErrors([error.message], error.statusCode);
    throw error;
  }
  if (isApiRequest(req)) return res.status(id ? 200 : 201).json({ message: "Delivery address saved.", address });
  res.redirect(303, next === "checkout" ? "/checkout?addressId=" + address.id + "&notice=address-saved" : "/addresses?notice=address-saved");
}

async function removeAddress(req, res) {
  await addresses.remove(requestOwner(req), validation.id(req.params.id, "address"));
  if (isApiRequest(req)) return res.json({ message: "Delivery address removed.", addresses: await addresses.list(req.currentUser.id) });
  res.redirect(303, "/addresses?notice=address-removed");
}

async function defaultAddress(req, res) {
  const address = await addresses.setDefault(requestOwner(req), validation.id(req.params.id, "address"));
  if (isApiRequest(req)) return res.json({ message: "Default delivery address updated.", address });
  res.redirect(303, "/addresses?notice=address-default");
}

function checkoutInput(source = {}, requireConfirmation = false) {
  const input = { addressId: source.addressId ? validation.id(source.addressId, "delivery address") : null, couponCode: validation.couponCode(source.couponCode) };
  if (requireConfirmation) {
    if (!input.addressId) throw new ShoppingError("Choose a delivery address.");
    input.checkoutKey = validation.uuid(source.checkoutKey);
    input.quoteToken = source.quoteToken;
  }
  return input;
}

async function showCheckout(req, res) {
  let preview, errors = [], status = 200;
  try {
    const input = checkoutInput(req.query);
    preview = await orders.preview(requestOwner(req), input.addressId, input.couponCode);
  } catch (error) {
    if (isApiRequest(req) || !(error instanceof ShoppingError) || ![400, 409].includes(error.statusCode)) throw error;
    // Preserve the entered coupon while leaving confirmation disabled until a valid review exists.
    preview = await orders.preview(requestOwner(req), null, "");
    preview.couponCode = typeof req.query.couponCode === "string" ? req.query.couponCode.slice(0, 50) : "";
    preview.quoteToken = "";
    errors = [error.message]; status = error.statusCode;
  }
  if (isApiRequest(req)) return res.json({ checkout: preview });
  res.status(status).render("orders/checkout", pageData("Checkout", { checkout: preview, errors }));
}

function reviewCheckout(req, res) {
  const input = checkoutInput(req.body);
  res.redirect(303, "/checkout?" + new URLSearchParams({ ...(input.addressId ? { addressId: input.addressId } : {}), couponCode: input.couponCode }));
}

async function placeOrder(req, res) {
  let result;
  try {
    const input = checkoutInput(req.body, true);
    result = await orders.place(requestOwner(req), input);
  } catch (error) {
    if (isApiRequest(req) || !(error instanceof ShoppingError) || ![400, 409].includes(error.statusCode)) throw error;
    return res.status(error.statusCode).render("orders/review-error", pageData("Review your checkout", { message: error.message }));
  }
  if (isApiRequest(req)) return res.status(result.created ? 201 : 200).json({ message: result.created ? "Order placed. Complete the demo payment." : "This order was already placed.", replayed: !result.created, order: await orders.details(req.currentUser.id, result.id) });
  res.redirect(303, "/orders/" + result.id + (result.created ? "?notice=order-placed" : ""));
}

async function showOrders(req, res) {
  let page = req.query.page === undefined ? "1" : req.query.page;
  if (typeof page !== "string" || !/^[1-9]\d{0,5}$/.test(page)) throw new ShoppingError("Choose a valid order history page.");
  page = Number(page);
  const history = await orders.history(req.currentUser.id, page);
  if (isApiRequest(req)) return res.json({ orders: history });
  res.render("orders/index", pageData("Order history", { history }));
}

async function showOrder(req, res) {
  const order = await orders.details(req.currentUser.id, validation.id(req.params.id, "order"));
  if (isApiRequest(req)) return res.json({ order, paymentKey: order.canPay ? randomUUID() : null });
  res.render("orders/show", pageData("Order " + order.orderNumber, { order, paymentKey: randomUUID() }));
}

async function payOrder(req, res) {
  const id = validation.id(req.params.id, "order");
  const body = req.body || {};
  const payment = await payments.pay(requestOwner(req), id, validation.uuid(body.paymentKey), body.outcome);
  if (isApiRequest(req)) return res.json({ message: payment.status === "succeeded" ? "Demo payment succeeded." : "Demo payment failed. You can retry or cancel the unpaid order.", payment, order: await orders.details(req.currentUser.id, id) });
  res.redirect(303, "/orders/" + id + "?notice=" + (payment.status === "succeeded" ? "payment-success" : "payment-failed"));
}

async function cancelOrder(req, res) {
  const id = validation.id(req.params.id, "order");
  await orders.cancel(requestOwner(req), id);
  if (isApiRequest(req)) return res.json({ message: "Order cancelled. Stock and any coupon reservation have been restored.", order: await orders.details(req.currentUser.id, id) });
  res.redirect(303, "/orders/" + id + "?notice=order-cancelled");
}

module.exports = { showAddresses, showAddressForm, saveAddress, removeAddress, defaultAddress, showCheckout, reviewCheckout, placeOrder, showOrders, showOrder, payOrder, cancelOrder };
