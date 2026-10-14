const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// UNIQUE (order_id, product_id); quantity > 0.
const OrderItem = sequelize.define("OrderItem", {
  id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true
  },
  order_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  product_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  product_name: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: {"len": [1, 150], "notEmpty": true}
  },
  unit_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {"isDecimal": true, "min": 0}
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {"isInt": true, "min": 1}
  },
  line_total: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {"isDecimal": true, "min": 0}
  }
}, {
  tableName: "order_items",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
  indexes: [{"name": "order_items_order_product_unique", "fields": ["order_id", "product_id"], "unique": true}, {"name": "order_items_order_id_index", "fields": ["order_id"]}, {"name": "order_items_product_id_index", "fields": ["product_id"]}]
});

module.exports = OrderItem;
