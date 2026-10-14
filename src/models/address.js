const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// At most one default address per user.
const Address = sequelize.define("Address", {
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
  label: {
    type: DataTypes.STRING(50),
    allowNull: true,
    validate: {"len": [0, 50]}
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
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: "addresses",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
  indexes: [{"name": "addresses_one_default_per_user", "fields": ["user_id"], "unique": true, "where": {"is_default": true}}, {"name": "addresses_user_id_index", "fields": ["user_id"]}]
});

module.exports = Address;
