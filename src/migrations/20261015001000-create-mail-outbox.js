module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.createTable("mail_outbox", {
        id: { type: Sequelize.UUID, primaryKey: true, allowNull: false, defaultValue: Sequelize.literal("gen_random_uuid()") },
        event_key: { type: Sequelize.STRING(160), allowNull: false, unique: true },
        kind: { type: Sequelize.STRING(30), allowNull: false },
        user_id: { type: Sequelize.BIGINT, allowNull: true, references: { model: "users", key: "id" }, onDelete: "SET NULL", onUpdate: "CASCADE" },
        order_id: { type: Sequelize.BIGINT, allowNull: true, references: { model: "orders", key: "id" }, onDelete: "SET NULL", onUpdate: "CASCADE" },
        recipient: { type: Sequelize.STRING(254), allowNull: false },
        subject: { type: Sequelize.STRING(200), allowNull: false },
        text_body: { type: Sequelize.TEXT, allowNull: false },
        html_body: { type: Sequelize.TEXT, allowNull: false },
        status: { type: Sequelize.STRING(15), allowNull: false, defaultValue: "pending" },
        attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        next_attempt_at: { type: Sequelize.DATE, allowNull: true, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        lease_until: { type: Sequelize.DATE, allowNull: true },
        lease_token: { type: Sequelize.UUID, allowNull: true },
        completed_at: { type: Sequelize.DATE, allowNull: true },
        preview_file: { type: Sequelize.STRING(50), allowNull: true },
        last_error: { type: Sequelize.STRING(200), allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") }
      }, { transaction });
      await queryInterface.sequelize.query("ALTER TABLE mail_outbox ADD CONSTRAINT mail_outbox_status_valid CHECK (status IN ('pending', 'sending', 'sent', 'previewed', 'failed')), ADD CONSTRAINT mail_outbox_attempts_valid CHECK (attempts >= 0), ADD CONSTRAINT mail_outbox_kind_valid CHECK (kind IN ('welcome', 'order_confirmation', 'order_status'))", { transaction });
      await queryInterface.addIndex("mail_outbox", ["status", "next_attempt_at"], { name: "mail_outbox_ready_index", transaction });
      await queryInterface.addIndex("mail_outbox", ["order_id"], { name: "mail_outbox_order_index", transaction });
      await queryInterface.addIndex("mail_outbox", ["user_id"], { name: "mail_outbox_user_index", transaction });
    });
  },
  async down(queryInterface) { await queryInterface.dropTable("mail_outbox"); }
};
