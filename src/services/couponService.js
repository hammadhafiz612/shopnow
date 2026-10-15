const { Coupon, CouponRedemption } = require("../models");
const { toMinorUnits, toDecimal } = require("../utils/money");
const formatPrice = require("../utils/formatPrice");
const ShoppingError = require("../utils/ShoppingError");

async function lock(code, transaction) {
  if (!code) return null;
  const coupon = await Coupon.findOne({ where: { code }, transaction, lock: transaction.LOCK.UPDATE });
  if (!coupon || !coupon.is_active) throw new ShoppingError("That coupon is not available.");
  return coupon;
}

async function discount(coupon, userId, subtotal, transaction) {
  if (!coupon) return 0n;
  if (coupon.expires_at && coupon.expires_at.getTime() <= Date.now()) throw new ShoppingError("That coupon has expired.");
  if (subtotal < toMinorUnits(coupon.min_order_amount)) throw new ShoppingError(`This coupon requires a subtotal of at least ${formatPrice(coupon.min_order_amount)}.`);
  const where = { coupon_id: coupon.id, status: "active" };
  // All reservations and releases hold the coupon row lock, including pending orders.
  const used = await CouponRedemption.count({ where, transaction });
  if (coupon.global_usage_limit !== null && used >= coupon.global_usage_limit) throw new ShoppingError("That coupon has reached its usage limit.", 409);
  if (coupon.per_user_usage_limit !== null) {
    const byUser = await CouponRedemption.count({ where: { ...where, user_id: userId }, transaction });
    if (byUser >= coupon.per_user_usage_limit) throw new ShoppingError("You have already used this coupon the maximum number of times.", 409);
  }
  const value = toMinorUnits(coupon.discount_value);
  // A percentage with two decimal places is a number of basis points. Round half up to a paisa.
  const amount = coupon.discount_type === "fixed" ? value : (subtotal * value + 5000n) / 10000n;
  return amount > subtotal ? subtotal : amount;
}

function present(coupon) {
  return coupon ? { id: String(coupon.id), code: coupon.code, type: coupon.discount_type, value: toDecimal(toMinorUnits(coupon.discount_value)) } : null;
}

module.exports = { lock, discount, present };
