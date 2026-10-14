const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// At most one primary image per product.
const ProductImage = sequelize.define("ProductImage", {
  id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true
  },
  product_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  file_path: {
    type: DataTypes.STRING(500),
    allowNull: false,
    validate: {"len": [1, 500], "notEmpty": true}
  },
  alt_text: {
    type: DataTypes.STRING(200),
    allowNull: true,
    validate: {"len": [0, 200]}
  },
  sort_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {"isInt": true, "min": 0}
  },
  is_primary: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: "product_images",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
  indexes: [{"name": "product_images_one_primary_per_product", "fields": ["product_id"], "unique": true, "where": {"is_primary": true}}, {"name": "product_images_product_id_index", "fields": ["product_id"]}]
});

module.exports = ProductImage;
