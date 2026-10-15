const path = require("node:path");

module.exports = {
  productImages: path.resolve(__dirname, "../../uploads/products"),
  mailPreviews: path.resolve(__dirname, "../../mail-preview"),
  imageFilename: /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.webp$/,
  previewFilename: /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.eml$/
};
