const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// One saved cart per account, or one temporary cart per anonymous session.
const Cart = sequelize.define("Cart", {
  id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
    unique: true
  },
  session_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
    references: { model: "app_sessions", key: "sid" },
    onDelete: "CASCADE",
    onUpdate: "CASCADE"
  }
}, {
  tableName: "carts",
  validate: {
    oneOwner() {
      if (Boolean(this.user_id) === Boolean(this.session_id)) {
        throw new Error("A cart must belong to exactly one account or guest session.");
      }
    }
  },
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at"
});

module.exports = Cart;
