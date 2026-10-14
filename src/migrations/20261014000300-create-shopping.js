// Apply this schema change with npm run db:migrate.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async function (transaction) {
      await queryInterface.createTable("carts", {
        id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        user_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          unique: true,
          references: { model: "users", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
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

      await queryInterface.createTable("cart_items", {
        id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        cart_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: "carts", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
        },
        product_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: "products", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT"
        },
        quantity: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1
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
        "ALTER TABLE \"cart_items\" ADD CONSTRAINT \"cart_items_quantity_positive\" CHECK (quantity > 0)",
        { transaction }
      );
      await queryInterface.addIndex("cart_items", ["cart_id", "product_id"], {
        name: "cart_items_cart_product_unique",
        unique: true,
        transaction
      });
      await queryInterface.addIndex("cart_items", ["cart_id"], {
        name: "cart_items_cart_id_index",
        transaction
      });
      await queryInterface.addIndex("cart_items", ["product_id"], {
        name: "cart_items_product_id_index",
        transaction
      });

      await queryInterface.createTable("wishlists", {
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
          onDelete: "CASCADE"
        },
        product_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: "products", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
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

      await queryInterface.addIndex("wishlists", ["user_id", "product_id"], {
        name: "wishlists_user_product_unique",
        unique: true,
        transaction
      });
      await queryInterface.addIndex("wishlists", ["user_id"], {
        name: "wishlists_user_id_index",
        transaction
      });
      await queryInterface.addIndex("wishlists", ["product_id"], {
        name: "wishlists_product_id_index",
        transaction
      });

      await queryInterface.createTable("coupons", {
        id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        code: {
          type: Sequelize.STRING(50),
          allowNull: false,
          unique: true
        },
        discount_type: {
          type: Sequelize.ENUM("fixed", "percentage"),
          allowNull: false
        },
        discount_value: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false
        },
        min_order_amount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: "0.00"
        },
        expires_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        global_usage_limit: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        per_user_usage_limit: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
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
        "ALTER TABLE \"coupons\" ADD CONSTRAINT \"coupons_discount_positive\" CHECK (discount_value > 0)",
        { transaction }
      );
      await queryInterface.sequelize.query(
        "ALTER TABLE \"coupons\" ADD CONSTRAINT \"coupons_percentage_valid\" CHECK (discount_type <> 'percentage' OR discount_value <= 100)",
        { transaction }
      );
      await queryInterface.sequelize.query(
        "ALTER TABLE \"coupons\" ADD CONSTRAINT \"coupons_minimum_nonnegative\" CHECK (min_order_amount >= 0)",
        { transaction }
      );
      await queryInterface.sequelize.query(
        "ALTER TABLE \"coupons\" ADD CONSTRAINT \"coupons_global_limit_positive\" CHECK (global_usage_limit IS NULL OR global_usage_limit > 0)",
        { transaction }
      );
      await queryInterface.sequelize.query(
        "ALTER TABLE \"coupons\" ADD CONSTRAINT \"coupons_user_limit_positive\" CHECK (per_user_usage_limit IS NULL OR per_user_usage_limit > 0)",
        { transaction }
      );
      await queryInterface.sequelize.query(
        "ALTER TABLE \"coupons\" ADD CONSTRAINT \"coupons_code_uppercase\" CHECK (code = UPPER(code))",
        { transaction }
      );

    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async function (transaction) {
      await queryInterface.dropTable("coupons", { transaction });
      await queryInterface.dropEnum("enum_coupons_discount_type", { transaction });
      await queryInterface.dropTable("wishlists", { transaction });
      await queryInterface.dropTable("cart_items", { transaction });
      await queryInterface.dropTable("carts", { transaction });
    });
  }
};
