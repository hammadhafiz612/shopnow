const sequelize = require("../config/database");

async function checkHealth(req, res) {
  try {
    await sequelize.authenticate();

    res.status(200).json({
      status: "ok",
      application: "ShopNow",
      database: "connected"
    });
  } catch {
    // Do not expose database credentials or raw database errors to the browser.
    res.status(503).json({
      status: "unavailable",
      application: "ShopNow",
      database: "unavailable"
    });
  }
}

module.exports = { checkHealth };
