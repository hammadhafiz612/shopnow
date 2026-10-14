const catalogue = require("../data/sampleCatalogue");

function productSku(category, index) {
  return "SHOP-" + category.prefix + "-" + String(index + 1).padStart(3, "0");
}

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async function (transaction) {
      const now = new Date();
      const categoryRows = catalogue.map(function (category) {
        return { name: category.name, slug: category.slug, is_active: true, created_at: now, updated_at: now };
      });

      // Do not overwrite existing rows if this seed is replayed.
      await queryInterface.bulkInsert("categories", categoryRows, { transaction, ignoreDuplicates: true });
      const [savedCategories] = await queryInterface.sequelize.query(
        'SELECT id, slug FROM categories WHERE slug IN (:slugs)',
        { replacements: { slugs: catalogue.map(function (category) { return category.slug; }) }, transaction }
      );
      const categoryIds = {};
      savedCategories.forEach(function (category) { categoryIds[category.slug] = category.id; });

      const products = [];
      catalogue.forEach(function (category) {
        category.products.forEach(function (product, index) {
          products.push({
            category_id: categoryIds[category.slug], sku: productSku(category, index),
            name: product.name, description: product.description, price: product.price,
            stock_quantity: product.stock, is_active: true, created_at: now, updated_at: now
          });
        });
      });
      await queryInterface.bulkInsert("products", products, { transaction, ignoreDuplicates: true });

      const [savedProducts] = await queryInterface.sequelize.query(
        'SELECT id, sku, name FROM products WHERE sku IN (:skus)',
        { replacements: { skus: products.map(function (product) { return product.sku; }) }, transaction }
      );
      const productIds = {};
      savedProducts.forEach(function (product) { productIds[product.sku] = product.id; });

      const images = [];
      catalogue.forEach(function (category) {
        category.products.forEach(function (product, index) {
          images.push({
            product_id: productIds[productSku(category, index)],
            file_path: "/images/demo/" + category.slug + ".svg",
            alt_text: "Demo illustration for " + product.name,
            sort_order: 0, is_primary: true, created_at: now, updated_at: now
          });
        });
      });
      await queryInterface.bulkInsert("product_images", images, { transaction, ignoreDuplicates: true });

      const expires = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      await queryInterface.bulkInsert("coupons", [
        { code: "WELCOME10", discount_type: "percentage", discount_value: "10.00", min_order_amount: "1000.00", expires_at: expires, global_usage_limit: 200, per_user_usage_limit: 1, is_active: true, created_at: now, updated_at: now },
        { code: "SAVE500", discount_type: "fixed", discount_value: "500.00", min_order_amount: "2500.00", expires_at: expires, global_usage_limit: 100, per_user_usage_limit: 2, is_active: true, created_at: now, updated_at: now }
      ], { transaction, ignoreDuplicates: true });
    });
  },

  async down(queryInterface) {
    // Only remove the demo rows. Historical order foreign keys protect purchased products.
    await queryInterface.sequelize.transaction(async function (transaction) {
      const skus = [];
      catalogue.forEach(function (category) {
        category.products.forEach(function (product, index) { skus.push(productSku(category, index)); });
      });
      const [products] = await queryInterface.sequelize.query(
        'SELECT id FROM products WHERE sku IN (:skus)', { replacements: { skus }, transaction }
      );
      if (products.length) {
        const ids = products.map(function (product) { return product.id; });
        await queryInterface.sequelize.query('DELETE FROM product_images WHERE product_id IN (:ids)', { replacements: { ids }, transaction });
        await queryInterface.sequelize.query('DELETE FROM products WHERE id IN (:ids)', { replacements: { ids }, transaction });
      }
      await queryInterface.sequelize.query(
        'DELETE FROM categories WHERE slug IN (:slugs) AND NOT EXISTS (SELECT 1 FROM products WHERE products.category_id = categories.id)',
        { replacements: { slugs: catalogue.map(function (category) { return category.slug; }) }, transaction }
      );
      await queryInterface.sequelize.query('DELETE FROM coupons WHERE code IN (:codes)', {
        replacements: { codes: ["WELCOME10", "SAVE500"] }, transaction
      });
    });
  }
};
