// Apply this schema change with npm run db:migrate.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async function (transaction) {
      await queryInterface.createTable("categories", {
        id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        slug: {
          type: Sequelize.STRING(120),
          allowNull: false,
          unique: true
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

      await queryInterface.createTable("products", {
        id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        category_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: "categories", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT"
        },
        sku: {
          type: Sequelize.STRING(60),
          allowNull: false,
          unique: true
        },
        name: {
          type: Sequelize.STRING(150),
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        price: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false
        },
        stock_quantity: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
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
        "ALTER TABLE \"products\" ADD CONSTRAINT \"products_price_nonnegative\" CHECK (price >= 0)",
        { transaction }
      );
      await queryInterface.sequelize.query(
        "ALTER TABLE \"products\" ADD CONSTRAINT \"products_stock_nonnegative\" CHECK (stock_quantity >= 0)",
        { transaction }
      );
      await queryInterface.addIndex("products", ["category_id"], {
        name: "products_category_id_index",
        transaction
      });

      await queryInterface.createTable("product_images", {
        id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        product_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: "products", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
        },
        file_path: {
          type: Sequelize.STRING(500),
          allowNull: false
        },
        alt_text: {
          type: Sequelize.STRING(200),
          allowNull: true
        },
        sort_order: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        is_primary: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
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
        "ALTER TABLE \"product_images\" ADD CONSTRAINT \"product_images_sort_nonnegative\" CHECK (sort_order >= 0)",
        { transaction }
      );
      await queryInterface.addIndex("product_images", ["product_id"], {
        name: "product_images_one_primary_per_product",
        unique: true,
        where: {"is_primary": true},
        transaction
      });
      await queryInterface.addIndex("product_images", ["product_id"], {
        name: "product_images_product_id_index",
        transaction
      });

    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async function (transaction) {
      await queryInterface.dropTable("product_images", { transaction });
      await queryInterface.dropTable("products", { transaction });
      await queryInterface.dropTable("categories", { transaction });
    });
  }
};
