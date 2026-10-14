const settings = require("./settings");

// Remember which migrations AND seeders have already run in this database.
module.exports = {
  development: {
    ...settings.database,
    migrationStorage: "sequelize",
    seederStorage: "sequelize",
    seederStorageTableName: "SequelizeData"
  }
};
