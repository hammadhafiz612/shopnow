module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.changeColumn("carts", "user_id", { type: Sequelize.BIGINT, allowNull: true }, { transaction });
      await queryInterface.addColumn("carts", "session_id", {
        type: Sequelize.STRING(255), allowNull: true, unique: true,
        references: { model: "app_sessions", key: "sid" },
        onDelete: "CASCADE", onUpdate: "CASCADE"
      }, { transaction });
      await queryInterface.sequelize.query(
        'ALTER TABLE carts ADD CONSTRAINT carts_exactly_one_owner CHECK ((user_id IS NOT NULL AND session_id IS NULL) OR (user_id IS NULL AND session_id IS NOT NULL))',
        { transaction }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      // Only temporary guest carts must be removed when rolling this feature back.
      await queryInterface.sequelize.query('DELETE FROM carts WHERE session_id IS NOT NULL', { transaction });
      await queryInterface.removeConstraint("carts", "carts_exactly_one_owner", { transaction });
      await queryInterface.removeColumn("carts", "session_id", { transaction });
      await queryInterface.changeColumn("carts", "user_id", { type: Sequelize.BIGINT, allowNull: false }, { transaction });
    });
  }
};
