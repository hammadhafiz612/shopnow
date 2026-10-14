const sequelize = require("../src/config/database");

async function checkDatabase() {
  try {
    await sequelize.authenticate();
    console.log("PostgreSQL connection successful.");
    console.log("Step 1 database connection is ready.");
  } catch {
    console.error("PostgreSQL connection failed.");
    console.error("Check that PostgreSQL is running and shopnow_db exists.");
    console.error("Check DB_HOST, DB_PORT, DB_NAME, DB_USER and DB_PASSWORD in .env.");
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

checkDatabase();
