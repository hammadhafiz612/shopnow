class ShoppingError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "ShoppingError";
    this.statusCode = statusCode;
  }
}

module.exports = ShoppingError;
