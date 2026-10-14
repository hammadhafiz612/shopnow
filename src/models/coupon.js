const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// type: fixed | percentage; value > 0.
const Coupon = sequelize.define("Coupon", {
  id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {"len": [1, 50], "notEmpty": true},
    set: function (value) {
      this.setDataValue("code", typeof value === "string" ? value.trim().toUpperCase() : value);
    }
  },
  discount_type: {
    type: DataTypes.ENUM("fixed", "percentage"),
    allowNull: false
  },
  discount_value: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {"isDecimal": true, "min": 0.01}
  },
  min_order_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: "0.00",
    validate: {"isDecimal": true, "min": 0}
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  global_usage_limit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {"isInt": true, "min": 1}
  },
  per_user_usage_limit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {"isInt": true, "min": 1}
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: "coupons",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
  validate: {
    percentageWithinRange() {
      if (this.discount_type === "percentage" && Number(this.discount_value) > 100) {
        throw new Error("Percentage discount cannot exceed 100.");
      }
    }
  }
});

module.exports = Coupon;
