const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Single-use token; store its hash only.
const PasswordResetToken = sequelize.define("PasswordResetToken", {
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
  token_hash: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
    validate: {"isHexadecimal": true, "len": [64, 64]}
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  used_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: "password_reset_tokens",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false,
  indexes: [{"name": "password_reset_tokens_user_id_index", "fields": ["user_id"]}]
});

module.exports = PasswordResetToken;
