const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// status: pending | succeeded | failed.
const Payment = sequelize.define("Payment", {
  id: {
    type: DataTypes.BIGINT,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true
  },
  order_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  payment_reference: {
    type: DataTypes.STRING(80),
    allowNull: false,
    unique: true,
    validate: {"len": [1, 80], "notEmpty": true}
  },
  idempotency_key: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    defaultValue: DataTypes.UUIDV4
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {"isDecimal": true, "min": 0}
  },
  currency: {
    type: DataTypes.CHAR(3),
    allowNull: false,
    defaultValue: "PKR",
    validate: {"is": ["^[A-Z]{3}$"]},
    set: function (value) {
      this.setDataValue("currency", typeof value === "string" ? value.trim().toUpperCase() : value);
    }
  },
  status: {
    type: DataTypes.ENUM("pending", "succeeded", "failed"),
    allowNull: false,
    defaultValue: "pending"
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  failure_reason: {
    type: DataTypes.STRING(200),
    allowNull: true,
    validate: {"len": [0, 200]}
  }
}, {
  tableName: "payments",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
  indexes: [{"name": "payments_one_success_per_order", "fields": ["order_id"], "unique": true, "where": {"status": "succeeded"}}, {"name": "payments_order_id_index", "fields": ["order_id"]}]
});

module.exports = Payment;
