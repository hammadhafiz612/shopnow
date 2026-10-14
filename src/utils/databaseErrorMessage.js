function databaseErrorMessage(error) {
  const code = error.original && error.original.code;

  if (code === "28P01" || error.name === "SequelizeAccessDeniedError") {
    return "Authentication failed: check DB_USER and DB_PASSWORD in .env.";
  }
  if (code === "3D000") {
    return "Database not found: create the database named in DB_NAME.";
  }
  if (code === "ECONNREFUSED" || error.name === "SequelizeConnectionRefusedError") {
    return "PostgreSQL is not reachable: start the service and check DB_HOST and DB_PORT.";
  }
  return "Check that PostgreSQL is running and the DB settings in .env are correct.";
}

module.exports = databaseErrorMessage;
