const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Immutable delivery address snapshot.
const OrderAddress = sequelize.define("OrderAddress", {
  order_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    primaryKey: true
  },
  recipient_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {"len": [1, 100], "notEmpty": true}
  },
  phone: {
    type: DataTypes.STRING(30),
    allowNull: false,
    validate: {"len": [1, 30], "notEmpty": true}
  },
  line1: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {"len": [1, 200], "notEmpty": true}
  },
  line2: {
    type: DataTypes.STRING(200),
    allowNull: true,
    validate: {"len": [0, 200]}
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {"len": [1, 100], "notEmpty": true}
  },
  state: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {"len": [0, 100]}
  },
  postal_code: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {"len": [0, 20]}
  },
  country_code: {
    type: DataTypes.CHAR(2),
    allowNull: false,
    validate: {"is": ["^[A-Z]{2}$"]},
    set: function (value) {
      this.setDataValue("country_code", typeof value === "string" ? value.trim().toUpperCase() : value);
    }
  }
}, {
  tableName: "order_addresses",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false
});

module.exports = OrderAddress;
