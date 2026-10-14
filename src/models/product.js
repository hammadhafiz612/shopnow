const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// CHECK price >= 0; stock_quantity >= 0.
const Product = sequelize.define("Product", {
  id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true
  },
  category_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  sku: {
    type: DataTypes.STRING(60),
    allowNull: false,
    unique: true,
    validate: {"len": [1, 60], "notEmpty": true}
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: {"len": [1, 150], "notEmpty": true}
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {"notEmpty": true}
  },
  price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {"isDecimal": true, "min": 0}
  },
  stock_quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {"isInt": true, "min": 0}
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: "products",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
  indexes: [{"name": "products_category_id_index", "fields": ["category_id"]}]
});

module.exports = Product;
