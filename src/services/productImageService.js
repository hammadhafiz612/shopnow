const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const sharp = require("sharp");
const { Op } = require("sequelize");
const { sequelize, Product, ProductImage } = require("../models");
const { lockAdmin } = require("./adminAccess");
const storage = require("../config/storage");
const ShoppingError = require("../utils/ShoppingError");

const MAX_IMAGES = 6;
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PIXELS = 16000000;
const TYPES = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" };

async function product(id, transaction, lock = false) {
  const row = await Product.findByPk(id, { attributes: ["id", "name", "sku"], transaction, ...(lock ? { lock: transaction.LOCK.UPDATE } : {}) });
  if (!row) throw new ShoppingError("That product was not found.", 404);
  return row;
}

async function list(id, transaction) {
  const rows = await ProductImage.findAll({ where: { product_id: id }, order: [["is_primary", "DESC"], ["sort_order", "ASC"], ["id", "ASC"]], transaction });
  return rows.map(row => ({ id: String(row.id), productId: String(row.product_id), src: row.file_path, alt: row.alt_text || "", isPrimary: row.is_primary }));
}

async function normalize(file) {
  if (!file || !file.buffer?.length) throw new ShoppingError("Choose an image to upload.");
  if (file.size > MAX_BYTES) throw new ShoppingError("The image must be 5 MiB or smaller.", 413);
  const buffer = file.buffer;
  const signature = buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "png"
    : buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 ? "jpeg"
      : buffer.subarray(0,4).toString() === "RIFF" && buffer.subarray(8,12).toString() === "WEBP" ? "webp" : "";
  if (!signature || TYPES[file.mimetype] !== signature) throw new ShoppingError("Upload a valid JPEG, PNG or WebP image. Its content must match its type.");
  try {
    const image = sharp(buffer, { failOn: "warning", limitInputPixels: MAX_PIXELS });
    const metadata = await image.metadata();
    if (metadata.format !== signature || !metadata.width || !metadata.height || metadata.width > 6000 || metadata.height > 6000 || (metadata.pages || 1) !== 1) throw new Error("Unsupported image dimensions or animation.");
    return await image.rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  } catch {
    throw new ShoppingError("The image could not be decoded. Use a still JPEG, PNG or WebP with at most 16 million pixels and 6000 pixels per side.");
  }
}

async function upload(owner, id, file, alt, makePrimary) {
  const encoded = await normalize(file);
  let written, activeTransaction;
  try {
    await sequelize.transaction(async transaction => {
      activeTransaction = transaction;
      await lockAdmin(owner, transaction);
      await product(id, transaction, true);
      const rows = await ProductImage.findAll({ where: { product_id: id }, transaction });
      if (rows.length >= MAX_IMAGES) throw new ShoppingError(`A product can have at most ${MAX_IMAGES} images. Remove one before uploading another.`, 409);
      const primary = makePrimary || !rows.some(row => row.is_primary);
      if (primary) await ProductImage.update({ is_primary: false }, { where: { product_id: id, is_primary: true }, transaction });
      const filename = randomUUID() + ".webp";
      await ProductImage.create({ product_id: id, file_path: "/uploads/products/" + filename, alt_text: alt || null, is_primary: primary, sort_order: rows.length }, { transaction });
      await fs.mkdir(storage.productImages, { recursive: true });
      const target = path.join(storage.productImages, filename);
      await fs.writeFile(target, encoded, { flag: "wx", mode: 0o644 });
      written = target;
    });
  } catch (error) {
    // A lost commit acknowledgement is ambiguous: leave the file for the orphan-cleanup tool in that case.
    if (written && activeTransaction?.finished === "rollback") await fs.unlink(written).catch(() => {});
    throw error;
  }
}

async function change(owner, id, imageId, action, alt) {
  let removedPath;
  await sequelize.transaction(async transaction => {
    await lockAdmin(owner, transaction);
    await product(id, transaction, true);
    const image = await ProductImage.findOne({ where: { id: imageId, product_id: id }, transaction });
    if (!image) throw new ShoppingError("That product image was not found.", 404);
    if (action === "alt") await image.update({ alt_text: alt || null }, { transaction });
    else if (action === "primary") {
      if (image.is_primary) return;
      await ProductImage.update({ is_primary: false }, { where: { product_id: id, id: { [Op.ne]: image.id }, is_primary: true }, transaction });
      await image.update({ is_primary: true }, { transaction });
    } else if (action === "remove") {
      removedPath = image.file_path;
      await image.destroy({ transaction });
      const remaining = await ProductImage.findAll({ where: { product_id: id }, order: [["is_primary", "DESC"], ["sort_order", "ASC"], ["id", "ASC"]], transaction });
      if (remaining.length && !remaining.some(row => row.is_primary)) await remaining[0].update({ is_primary: true }, { transaction });
    } else throw new ShoppingError("Choose a valid image action.");
  });
  const filename = removedPath?.startsWith("/uploads/products/") ? removedPath.slice("/uploads/products/".length) : "";
  if (storage.imageFilename.test(filename) && !await ProductImage.count({ where: { file_path: removedPath } })) {
    await fs.unlink(path.join(storage.productImages, filename)).catch(error => { if (error.code !== "ENOENT") console.error("A removed product image needs orphan cleanup."); });
  }
}

module.exports = { MAX_IMAGES, MAX_BYTES, TYPES, product, list, upload, change };
