const { Sequelize } = require("sequelize");
const settings = require("./settings");

// This creates the connection object. authenticate() checks the real database.
const sequelize = new Sequelize(settings.database);

module.exports = sequelize;
