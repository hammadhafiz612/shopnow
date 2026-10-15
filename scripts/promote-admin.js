const { User, sequelize } = require("../src/models");
const { normalizeEmail, validEmail } = require("../src/utils/authValidation");
const databaseErrorMessage = require("../src/utils/databaseErrorMessage");

async function promoteAdmin() {
  const email = normalizeEmail(process.argv[2]);
  try {
    if (process.argv.length !== 3 || !validEmail(email)) {
      console.error("Usage: npm.cmd run admin:promote -- your-registered-email@example.com");
      process.exitCode = 1;
      return;
    }
    await sequelize.authenticate();
    const result = await sequelize.transaction(async transaction => {
      const user = await User.findOne({ where: { email }, transaction, lock: transaction.LOCK.UPDATE });
      if (!user) return "missing";
      if (user.role === "admin") return "already";
      await user.update({ role: "admin", auth_version: user.auth_version + 1 }, { transaction });
      return "promoted";
    });
    if (result === "missing") {
      console.error("No matching account. Register that email on the website first.");
      process.exitCode = 1;
    } else {
      console.log(result === "already" ? "This account already has admin access." : "Admin access enabled. Sign in again to open /admin.");
    }
  } catch (error) {
    console.error("Admin setup failed:", error.name);
    console.error(databaseErrorMessage(error));
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

promoteAdmin();
