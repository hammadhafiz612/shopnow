module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn("users", "auth_version", {
        type: Sequelize.INTEGER, allowNull: false, defaultValue: 0
      }, { transaction });
      await queryInterface.createTable("app_sessions", {
        sid: { type: Sequelize.STRING(255), primaryKey: true, allowNull: false },
        sess: { type: Sequelize.JSON, allowNull: false },
        expire: { type: Sequelize.DATE, allowNull: false }
      }, { transaction });
      await queryInterface.addIndex("app_sessions", ["expire"], { name: "app_sessions_expire_index", transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.dropTable("app_sessions", { transaction });
      await queryInterface.removeColumn("users", "auth_version", { transaction });
    });
  }
};
