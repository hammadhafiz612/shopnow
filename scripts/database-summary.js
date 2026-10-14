const models = require("../src/models");

async function showSummary() {
  try {
    await models.sequelize.authenticate();
    const rows = [];

    for (const name of Object.keys(models)) {
      if (name === "sequelize") continue;
      const model = models[name];
      rows.push({ table: model.getTableName(), rows: await model.count() });
    }

    console.table(rows);
    console.log("Database tables are ready.");
    console.log("Fresh demo seed: 5 categories, 25 products, 25 product image entries and 2 coupons.");
  } catch {
    console.error("Could not read all database tables.");
    console.error("Check the connection, then run npm run db:migrate and npm run db:seed.");
    process.exitCode = 1;
  } finally {
    await models.sequelize.close();
  }
}

showSummary();
