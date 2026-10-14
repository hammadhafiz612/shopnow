const sequelize = require("../src/config/database");
const databaseErrorMessage = require("../src/utils/databaseErrorMessage");

async function checkDatabase() {
  try {
    await sequelize.authenticate();
    console.log("PostgreSQL connection successful.");
    console.log("The database connection is ready.");
  } catch (error) {
    console.error("PostgreSQL connection failed.");
    console.error(databaseErrorMessage(error));
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

checkDatabase();
