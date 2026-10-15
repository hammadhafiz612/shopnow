const { randomUUID } = require("node:crypto");
const { UniqueConstraintError } = require("sequelize");
const { sequelize, Payment } = require("../models");
const { lockUser } = require("./shoppingOwner");
const { owned } = require("./orderService");
const ShoppingError = require("../utils/ShoppingError");
const notifications = require("./notificationService");

// This adapter simulates an outcome; it never contacts a gateway or accepts card details.
function simulate(outcome) {
  if (!["success", "failure"].includes(outcome)) throw new ShoppingError("Choose a successful or failed demo payment.");
  return outcome === "success" ? "succeeded" : "failed";
}

async function pay(owner, orderId, key, outcome) {
  const status = simulate(outcome);
  try {
    return await sequelize.transaction(async transaction => {
      await lockUser(owner, transaction);
      const order = await owned(owner.userId, orderId, transaction, true);
      const existing = await Payment.findOne({ where: { idempotency_key: key }, transaction });
      if (existing) {
        if (String(existing.order_id) !== String(order.id) || existing.status !== status) throw new ShoppingError("This payment key was used for a different attempt. Refresh the order page.", 409);
        return { reference: existing.payment_reference, status: existing.status, replayed: true };
      }
      if (order.order_status !== "pending" || order.payment_status === "paid") throw new ShoppingError("This order cannot accept another payment.", 409);
      const payment = await Payment.create({
        order_id: order.id, payment_reference: "DEMO-" + randomUUID(), idempotency_key: key,
        amount: order.total_amount, currency: order.currency, status, completed_at: new Date(),
        failure_reason: status === "failed" ? "Demo payment declined. Try another simulation or cancel the unpaid order." : null
      }, { transaction });
      const previousPaymentStatus = order.payment_status;
      await order.update({ payment_status: status === "succeeded" ? "paid" : "failed", order_status: status === "succeeded" ? "processing" : "pending" }, { transaction });
      if (previousPaymentStatus !== order.payment_status) await notifications.orderMessage(order, "payment:" + key, "order_status", transaction);
      return { reference: payment.payment_reference, status, replayed: false };
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) throw new ShoppingError("This payment has already been processed. Refresh the order page.", 409);
    throw error;
  }
}

module.exports = { pay };
