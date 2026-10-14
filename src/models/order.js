const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// total_amount = subtotal - discount_amount.
const Order = sequelize.define("Order", {
  id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  selected_address_id: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  coupon_id: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  order_number: {
    type: DataTypes.STRING(40),
    allowNull: false,
    unique: true,
    validate: {"len": [1, 40], "notEmpty": true}
  },
  checkout_key: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    defaultValue: DataTypes.UUIDV4
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {"isDecimal": true, "min": 0}
  },
  discount_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: "0.00",
    validate: {"isDecimal": true, "min": 0}
  },
  total_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {"isDecimal": true, "min": 0}
  },
  currency: {
    type: DataTypes.CHAR(3),
    allowNull: false,
    defaultValue: "PKR",
    validate: {"is": ["^[A-Z]{3}$"]},
    set: function (value) {
      this.setDataValue("currency", typeof value === "string" ? value.trim().toUpperCase() : value);
    }
  },
  order_status: {
    type: DataTypes.ENUM("pending", "processing", "shipped", "delivered", "cancelled"),
    allowNull: false,
    defaultValue: "pending"
  },
  payment_status: {
    type: DataTypes.ENUM("unpaid", "paid", "failed"),
    allowNull: false,
    defaultValue: "unpaid"
  },
  inventory_restored_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: "orders",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
  indexes: [{"name": "orders_user_id_index", "fields": ["user_id"]}, {"name": "orders_selected_address_id_index", "fields": ["selected_address_id"]}, {"name": "orders_coupon_id_index", "fields": ["coupon_id"]}]
});

module.exports = Order;
