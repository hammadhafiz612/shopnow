const bcrypt = require("bcrypt");
const { User, sequelize } = require("../models");
const notifications = require("./notificationService");

const PASSWORD_COST = 12;
// A valid fixed-cost dummy hash keeps unknown-email attempts on the bcrypt compare path.
const DUMMY_HASH = "$2b$12$mnKuc0XSRptyIlWtGDq2jugc.f9ctdlWgd8LaCIf2.ajRDUgdzDNC";

function publicUser(user) {
  return { id: String(user.id), full_name: user.full_name, email: user.email, role: user.role };
}

async function registerCustomer(values, password) {
  const passwordHash = await bcrypt.hash(password, PASSWORD_COST);
  // role/auth_version are never taken from the public request body.
  return sequelize.transaction(async transaction => {
    const user = await User.create({
      full_name: values.full_name, email: values.email,
      password_hash: passwordHash, role: "customer", auth_version: 0
    }, { transaction });
    await notifications.welcome(user, transaction);
    return user;
  });
}

async function authenticate(email, password) {
  const user = await User.findOne({ where: { email } });
  const matches = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  return user && matches ? user : null;
}

module.exports = { PASSWORD_COST, publicUser, registerCustomer, authenticate };
