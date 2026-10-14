const settings = require("./settings");

// Sequelize CLI uses this config for the migrations we will add in Step 2.
module.exports = {
  development: settings.database
};
