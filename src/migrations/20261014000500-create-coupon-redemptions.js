// Apply this schema change with npm run db:migrate.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async function (transaction) {
      await queryInterface.createTable("coupon_redemptions", {
        id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        coupon_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: "coupons", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT"
        },
        user_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: "users", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT"
        },
        order_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          unique: true,
          references: { model: "orders", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT"
        },
        discount_amount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false
        },
        status: {
          type: Sequelize.ENUM("active", "released"),
          allowNull: false,
          defaultValue: "active"
        },
        released_at: {
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
        "ALTER TABLE \"coupon_redemptions\" ADD CONSTRAINT \"coupon_redemptions_discount_nonnegative\" CHECK (discount_amount >= 0)",
        { transaction }
      );
      await queryInterface.sequelize.query(
        "ALTER TABLE \"coupon_redemptions\" ADD CONSTRAINT \"coupon_redemptions_release_consistent\" CHECK ((status = 'active' AND released_at IS NULL) OR (status = 'released' AND released_at IS NOT NULL))",
        { transaction }
      );
      await queryInterface.addIndex("coupon_redemptions", ["coupon_id"], {
        name: "coupon_redemptions_coupon_id_index",
        transaction
      });
      await queryInterface.addIndex("coupon_redemptions", ["user_id"], {
        name: "coupon_redemptions_user_id_index",
        transaction
      });

    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async function (transaction) {
      await queryInterface.dropTable("coupon_redemptions", { transaction });
      await queryInterface.dropEnum("enum_coupon_redemptions_status", { transaction });
    });
  }
};
