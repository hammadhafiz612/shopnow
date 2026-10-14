// Apply this schema change with npm run db:migrate.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async function (transaction) {
      await queryInterface.createTable("users", {
        id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        full_name: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        email: {
          type: Sequelize.STRING(254),
          allowNull: false,
          unique: true
        },
        password_hash: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        role: {
          type: Sequelize.ENUM("customer", "admin"),
          allowNull: false,
          defaultValue: "customer"
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
        "ALTER TABLE \"users\" ADD CONSTRAINT \"users_email_lowercase\" CHECK (email = LOWER(email))",
        { transaction }
      );

      await queryInterface.createTable("addresses", {
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
        label: {
          type: Sequelize.STRING(50),
          allowNull: true
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
        is_default: {
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
        "ALTER TABLE \"addresses\" ADD CONSTRAINT \"addresses_country_code_format\" CHECK (country_code ~ '^[A-Z]{2}$')",
        { transaction }
      );
      await queryInterface.addIndex("addresses", ["user_id"], {
        name: "addresses_one_default_per_user",
        unique: true,
        where: {"is_default": true},
        transaction
      });
      await queryInterface.addIndex("addresses", ["user_id"], {
        name: "addresses_user_id_index",
        transaction
      });

      await queryInterface.createTable("password_reset_tokens", {
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
        token_hash: {
          type: Sequelize.STRING(64),
          allowNull: false,
          unique: true
        },
        expires_at: {
          type: Sequelize.DATE,
          allowNull: false
        },
        used_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        }
      }, { transaction });

      await queryInterface.addIndex("password_reset_tokens", ["user_id"], {
        name: "password_reset_tokens_user_id_index",
        transaction
      });

    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async function (transaction) {
      await queryInterface.dropTable("password_reset_tokens", { transaction });
      await queryInterface.dropTable("addresses", { transaction });
      await queryInterface.dropTable("users", { transaction });
      await queryInterface.dropEnum("enum_users_role", { transaction });
    });
  }
};
