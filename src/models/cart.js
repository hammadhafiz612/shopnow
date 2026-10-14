const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// One current saved cart per customer.
const Cart = sequelize.define("Cart", {
  id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    unique: true
  }
}, {
  tableName: "carts",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at"
});

module.exports = Cart;
