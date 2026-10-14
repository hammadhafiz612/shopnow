const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// UNIQUE (user_id, product_id).
const Wishlist = sequelize.define("Wishlist", {
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
  product_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  }
}, {
  tableName: "wishlists",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
  indexes: [{"name": "wishlists_user_product_unique", "fields": ["user_id", "product_id"], "unique": true}, {"name": "wishlists_user_id_index", "fields": ["user_id"]}, {"name": "wishlists_product_id_index", "fields": ["product_id"]}]
});

module.exports = Wishlist;
