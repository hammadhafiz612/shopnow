const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// role: customer | admin
const User = sequelize.define("User", {
  id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true
  },
  full_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {"len": [1, 100], "notEmpty": true}
  },
  email: {
    type: DataTypes.STRING(254),
    allowNull: false,
    unique: true,
    validate: {"isEmail": true, "len": [3, 254]},
    set: function (value) {
      this.setDataValue("email", typeof value === "string" ? value.trim().toLowerCase() : value);
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {"len": [1, 255], "notEmpty": true}
  },
  role: {
    type: DataTypes.ENUM("customer", "admin"),
    allowNull: false,
    defaultValue: "customer"
  }
}, {
  tableName: "users",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at"
});

module.exports = User;
