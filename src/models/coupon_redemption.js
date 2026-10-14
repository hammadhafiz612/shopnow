const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// status: active | released.
const CouponRedemption = sequelize.define("CouponRedemption", {
  id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true
  },
  coupon_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  user_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  order_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    unique: true
  },
  discount_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {"isDecimal": true, "min": 0}
  },
  status: {
    type: DataTypes.ENUM("active", "released"),
    allowNull: false,
    defaultValue: "active"
  },
  released_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: "coupon_redemptions",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
  indexes: [{"name": "coupon_redemptions_coupon_id_index", "fields": ["coupon_id"]}, {"name": "coupon_redemptions_user_id_index", "fields": ["user_id"]}]
});

module.exports = CouponRedemption;
