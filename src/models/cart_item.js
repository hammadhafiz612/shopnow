const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// UNIQUE (cart_id, product_id).
const CartItem = sequelize.define("CartItem", {
  id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true
  },
  cart_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  product_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {"isInt": true, "min": 1}
  }
}, {
  tableName: "cart_items",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
  indexes: [{"name": "cart_items_cart_product_unique", "fields": ["cart_id", "product_id"], "unique": true}, {"name": "cart_items_cart_id_index", "fields": ["cart_id"]}, {"name": "cart_items_product_id_index", "fields": ["product_id"]}]
});

module.exports = CartItem;
