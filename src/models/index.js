const sequelize = require("../config/database");
const User = require("./user");
const Address = require("./address");
const PasswordResetToken = require("./password_reset_token");
const Category = require("./category");
const Product = require("./product");
const ProductImage = require("./product_image");
const Cart = require("./cart");
const CartItem = require("./cart_item");
const Wishlist = require("./wishlist");
const Coupon = require("./coupon");
const Order = require("./order");
const OrderItem = require("./order_item");
const OrderAddress = require("./order_address");
const Payment = require("./payment");
const CouponRedemption = require("./coupon_redemption");
const MailMessage = require("./mail_message");

// One-to-many: the parent has many rows; each child belongs to one parent.
User.hasMany(Address, { foreignKey: "user_id", as: "addresses", onDelete: "CASCADE" });
Address.belongsTo(User, { foreignKey: "user_id", as: "user", onDelete: "CASCADE" });
User.hasMany(PasswordResetToken, { foreignKey: "user_id", as: "passwordResetTokens", onDelete: "CASCADE" });
PasswordResetToken.belongsTo(User, { foreignKey: "user_id", as: "user", onDelete: "CASCADE" });

Category.hasMany(Product, { foreignKey: "category_id", as: "products", onDelete: "RESTRICT" });
Product.belongsTo(Category, { foreignKey: "category_id", as: "category", onDelete: "RESTRICT" });
Product.hasMany(ProductImage, { foreignKey: "product_id", as: "images", onDelete: "CASCADE" });
ProductImage.belongsTo(Product, { foreignKey: "product_id", as: "product", onDelete: "CASCADE" });

// One-to-one: user_id is unique in carts.
User.hasOne(Cart, { foreignKey: "user_id", as: "cart", onDelete: "CASCADE" });
Cart.belongsTo(User, { foreignKey: "user_id", as: "user", onDelete: "CASCADE" });

Cart.hasMany(CartItem, { foreignKey: "cart_id", as: "items", onDelete: "CASCADE" });
CartItem.belongsTo(Cart, { foreignKey: "cart_id", as: "cart", onDelete: "CASCADE" });
Product.hasMany(CartItem, { foreignKey: "product_id", as: "cartItems", onDelete: "RESTRICT" });
CartItem.belongsTo(Product, { foreignKey: "product_id", as: "product", onDelete: "RESTRICT" });
User.hasMany(Wishlist, { foreignKey: "user_id", as: "wishlistEntries", onDelete: "CASCADE" });
Wishlist.belongsTo(User, { foreignKey: "user_id", as: "user", onDelete: "CASCADE" });
Product.hasMany(Wishlist, { foreignKey: "product_id", as: "wishlistEntries", onDelete: "CASCADE" });
Wishlist.belongsTo(Product, { foreignKey: "product_id", as: "product", onDelete: "CASCADE" });

User.hasMany(Order, { foreignKey: "user_id", as: "orders", onDelete: "RESTRICT" });
Order.belongsTo(User, { foreignKey: "user_id", as: "customer", onDelete: "RESTRICT" });
Address.hasMany(Order, { foreignKey: "selected_address_id", as: "orders", onDelete: "SET NULL" });
Order.belongsTo(Address, { foreignKey: "selected_address_id", as: "selectedAddress", onDelete: "SET NULL" });
Coupon.hasMany(Order, { foreignKey: "coupon_id", as: "orders", onDelete: "RESTRICT" });
Order.belongsTo(Coupon, { foreignKey: "coupon_id", as: "coupon", onDelete: "RESTRICT" });
Order.hasMany(OrderItem, { foreignKey: "order_id", as: "items", onDelete: "RESTRICT" });
OrderItem.belongsTo(Order, { foreignKey: "order_id", as: "order", onDelete: "RESTRICT" });
Product.hasMany(OrderItem, { foreignKey: "product_id", as: "orderItems", onDelete: "RESTRICT" });
OrderItem.belongsTo(Product, { foreignKey: "product_id", as: "product", onDelete: "RESTRICT" });

// order_id is both the primary key and foreign key of the delivery snapshot.
Order.hasOne(OrderAddress, { foreignKey: "order_id", as: "deliveryAddress", onDelete: "RESTRICT" });
OrderAddress.belongsTo(Order, { foreignKey: "order_id", as: "order", onDelete: "RESTRICT" });
Order.hasMany(Payment, { foreignKey: "order_id", as: "payments", onDelete: "RESTRICT" });
Payment.belongsTo(Order, { foreignKey: "order_id", as: "order", onDelete: "RESTRICT" });
Order.hasOne(CouponRedemption, { foreignKey: "order_id", as: "couponRedemption", onDelete: "RESTRICT" });
CouponRedemption.belongsTo(Order, { foreignKey: "order_id", as: "order", onDelete: "RESTRICT" });
User.hasMany(CouponRedemption, { foreignKey: "user_id", as: "couponRedemptions", onDelete: "RESTRICT" });
CouponRedemption.belongsTo(User, { foreignKey: "user_id", as: "user", onDelete: "RESTRICT" });
Coupon.hasMany(CouponRedemption, { foreignKey: "coupon_id", as: "redemptions", onDelete: "RESTRICT" });
CouponRedemption.belongsTo(Coupon, { foreignKey: "coupon_id", as: "coupon", onDelete: "RESTRICT" });

// Infrastructure outbox relationships preserve the message snapshot if an account/order is removed.
User.hasMany(MailMessage, { foreignKey: "user_id", as: "notifications", onDelete: "SET NULL" });
MailMessage.belongsTo(User, { foreignKey: "user_id", as: "recipientUser", onDelete: "SET NULL" });
Order.hasMany(MailMessage, { foreignKey: "order_id", as: "notifications", onDelete: "SET NULL" });
MailMessage.belongsTo(Order, { foreignKey: "order_id", as: "order", onDelete: "SET NULL" });

// Many-to-many links use the same junction tables and their existing foreign keys.
// constraints: false here avoids redefining the direct foreign-key associations above.
User.belongsToMany(Product, { through: Wishlist, foreignKey: "user_id", otherKey: "product_id", as: "wishlistProducts", constraints: false });
Product.belongsToMany(User, { through: Wishlist, foreignKey: "product_id", otherKey: "user_id", as: "wishlistedBy", constraints: false });
Cart.belongsToMany(Product, { through: CartItem, foreignKey: "cart_id", otherKey: "product_id", as: "products", constraints: false });
Product.belongsToMany(Cart, { through: CartItem, foreignKey: "product_id", otherKey: "cart_id", as: "carts", constraints: false });
Order.belongsToMany(Product, { through: OrderItem, foreignKey: "order_id", otherKey: "product_id", as: "products", constraints: false });
Product.belongsToMany(Order, { through: OrderItem, foreignKey: "product_id", otherKey: "order_id", as: "orders", constraints: false });
// The same customer can redeem the same coupon on different orders if its limit allows it.
User.belongsToMany(Coupon, { through: { model: CouponRedemption, unique: false }, foreignKey: "user_id", otherKey: "coupon_id", as: "usedCoupons", constraints: false });
Coupon.belongsToMany(User, { through: { model: CouponRedemption, unique: false }, foreignKey: "coupon_id", otherKey: "user_id", as: "customers", constraints: false });

module.exports = {
  sequelize, User, Address, PasswordResetToken, Category, Product, ProductImage,
  Cart, CartItem, Wishlist, Coupon, Order, OrderItem, OrderAddress, Payment, CouponRedemption, MailMessage
};
