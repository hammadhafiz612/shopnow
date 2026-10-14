// Apply this schema change with npm run db:migrate.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async function (transaction) {
      await queryInterface.createTable("orders", {
        id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        user_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: "users", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT"
        },
        selected_address_id: {
          type: Sequelize.BIGINT,
          allowNull: true,
          references: { model: "addresses", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL"
        },
        coupon_id: {
          type: Sequelize.BIGINT,
          allowNull: true,
          references: { model: "coupons", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT"
        },
        order_number: {
          type: Sequelize.STRING(40),
          allowNull: false,
          unique: true
        },
        checkout_key: {
          type: Sequelize.UUID,
          allowNull: false,
          unique: true,
          defaultValue: Sequelize.literal("gen_random_uuid()")
        },
        subtotal: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false
        },
        discount_amount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: "0.00"
        },
        total_amount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false
        },
        currency: {
          type: Sequelize.CHAR(3),
          allowNull: false,
          defaultValue: "PKR"
        },
        order_status: {
          type: Sequelize.ENUM("pending", "processing", "shipped", "delivered", "cancelled"),
          allowNull: false,
          defaultValue: "pending"
        },
        payment_status: {
          type: Sequelize.ENUM("unpaid", "paid", "failed"),
          allowNull: false,
          defaultValue: "unpaid"
        },
        inventory_restored_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        }
      }, { transaction });

      await queryInterface.sequelize.query(
        "ALTER TABLE \"orders\" ADD CONSTRAINT \"orders_subtotal_nonnegative\" CHECK (subtotal >= 0)",
        { transaction }
      );
      await queryInterface.sequelize.query(
        "ALTER TABLE \"orders\" ADD CONSTRAINT \"orders_discount_valid\" CHECK (discount_amount >= 0 AND discount_amount <= subtotal)",
        { transaction }
      );
      await queryInterface.sequelize.query(
        "ALTER TABLE \"orders\" ADD CONSTRAINT \"orders_total_valid\" CHECK (total_amount = subtotal - discount_amount AND total_amount >= 0)",
        { transaction }
      );
      await queryInterface.sequelize.query(
        "ALTER TABLE \"orders\" ADD CONSTRAINT \"orders_currency_format\" CHECK (currency ~ '^[A-Z]{3}$')",
        { transaction }
      );
      await queryInterface.addIndex("orders", ["user_id"], {
        name: "orders_user_id_index",
        transaction
      });
      await queryInterface.addIndex("orders", ["selected_address_id"], {
        name: "orders_selected_address_id_index",
        transaction
      });
      await queryInterface.addIndex("orders", ["coupon_id"], {
        name: "orders_coupon_id_index",
        transaction
      });

      await queryInterface.createTable("order_items", {
        id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        order_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: "orders", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT"
        },
        product_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: "products", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT"
        },
        product_name: {
          type: Sequelize.STRING(150),
          allowNull: false
        },
        unit_price: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false
        },
        quantity: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        line_total: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        }
      }, { transaction });

      await queryInterface.sequelize.query(
        "ALTER TABLE \"order_items\" ADD CONSTRAINT \"order_items_quantity_positive\" CHECK (quantity > 0)",
        { transaction }
      );
      await queryInterface.sequelize.query(
        "ALTER TABLE \"order_items\" ADD CONSTRAINT \"order_items_price_nonnegative\" CHECK (unit_price >= 0)",
        { transaction }
      );
      await queryInterface.sequelize.query(
        "ALTER TABLE \"order_items\" ADD CONSTRAINT \"order_items_total_valid\" CHECK (line_total = unit_price * quantity AND line_total >= 0)",
        { transaction }
      );
      await queryInterface.addIndex("order_items", ["order_id", "product_id"], {
        name: "order_items_order_product_unique",
        unique: true,
        transaction
      });
      await queryInterface.addIndex("order_items", ["order_id"], {
        name: "order_items_order_id_index",
        transaction
      });
      await queryInterface.addIndex("order_items", ["product_id"], {
        name: "order_items_product_id_index",
        transaction
      });

      await queryInterface.createTable("order_addresses", {
        order_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          references: { model: "orders", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT"
        },
        recipient_name: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        phone: {
          type: Sequelize.STRING(30),
          allowNull: false
        },
        line1: {
          type: Sequelize.STRING(200),
          allowNull: false
        },
        line2: {
          type: Sequelize.STRING(200),
          allowNull: true
        },
        city: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        state: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        postal_code: {
          type: Sequelize.STRING(20),
          allowNull: true
        },
        country_code: {
          type: Sequelize.CHAR(2),
          allowNull: false
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        }
      }, { transaction });

      await queryInterface.sequelize.query(
        "ALTER TABLE \"order_addresses\" ADD CONSTRAINT \"order_addresses_country_code_format\" CHECK (country_code ~ '^[A-Z]{2}$')",
        { transaction }
      );

      await queryInterface.createTable("payments", {
        id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        order_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: "orders", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT"
        },
        payment_reference: {
          type: Sequelize.STRING(80),
          allowNull: false,
          unique: true
        },
        idempotency_key: {
          type: Sequelize.UUID,
          allowNull: false,
          unique: true,
          defaultValue: Sequelize.literal("gen_random_uuid()")
        },
        amount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false
        },
        currency: {
          type: Sequelize.CHAR(3),
          allowNull: false,
          defaultValue: "PKR"
        },
        status: {
          type: Sequelize.ENUM("pending", "succeeded", "failed"),
          allowNull: false,
          defaultValue: "pending"
        },
        completed_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        failure_reason: {
          type: Sequelize.STRING(200),
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        }
      }, { transaction });

      await queryInterface.sequelize.query(
        "ALTER TABLE \"payments\" ADD CONSTRAINT \"payments_amount_nonnegative\" CHECK (amount >= 0)",
        { transaction }
      );
      await queryInterface.sequelize.query(
        "ALTER TABLE \"payments\" ADD CONSTRAINT \"payments_currency_format\" CHECK (currency ~ '^[A-Z]{3}$')",
        { transaction }
      );
      await queryInterface.addIndex("payments", ["order_id"], {
        name: "payments_one_success_per_order",
        unique: true,
        where: {"status": "succeeded"},
        transaction
      });
      await queryInterface.addIndex("payments", ["order_id"], {
        name: "payments_order_id_index",
        transaction
      });

    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async function (transaction) {
      await queryInterface.dropTable("payments", { transaction });
      await queryInterface.dropEnum("enum_payments_status", { transaction });
      await queryInterface.dropTable("order_addresses", { transaction });
      await queryInterface.dropTable("order_items", { transaction });
      await queryInterface.dropTable("orders", { transaction });
      await queryInterface.dropEnum("enum_orders_order_status", { transaction });
      await queryInterface.dropEnum("enum_orders_payment_status", { transaction });
    });
  }
};
