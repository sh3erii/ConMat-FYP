const Product = require('../models/Product');
const ProductAuditLog = require('../models/ProductAuditLog');
const { Op } = require('sequelize');

const PRODUCT_STATUSES = ['Pending Review', 'Approved', 'Hidden', 'Rejected'];

function assertStatus(status) {
  if (!PRODUCT_STATUSES.includes(status)) {
    throw new Error(`Invalid product status. Allowed: ${PRODUCT_STATUSES.join(', ')}`);
  }
}

function buildProductWhere(query = {}) {
  const where = {};

  if (query.status && query.status !== 'All') where.status = query.status;
  if (query.category && query.category !== 'All') where.category = query.category;
  if (query.city && query.city !== 'All') where.city = query.city;

  if (query.search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${query.search}%` } },
      { category: { [Op.iLike]: `%${query.search}%` } },
      { city: { [Op.iLike]: `%${query.search}%` } },
      { productCode: { [Op.iLike]: `%${query.search}%` } },
    ];
  }

  return where;
}

async function listAdminProducts(query = {}) {
  const limit = Number(query.limit || 50);
  const page = Number(query.page || 1);
  const offset = (page - 1) * limit;

  const result = await Product.findAndCountAll({
    where: buildProductWhere(query),
    limit,
    offset,
    order: [['updatedAt', 'DESC']],
  });

  return {
    products: result.rows,
    total: result.count,
    page,
    totalPages: Math.ceil(result.count / limit),
  };
}

async function updateProductStatus(productId, payload = {}) {
  assertStatus(payload.status);

  const product = await Product.findByPk(productId);
  if (!product) throw new Error('Product not found.');

  const previousStatus = product.status || 'Pending Review';

  await product.update({
    status: payload.status,
    adminNote: payload.adminNote || payload.note || null,
    isPublished: payload.status === 'Approved',
  });

  await ProductAuditLog.create({
    productId: product.id,
    productCode: product.productCode || product.sku || null,
    action: 'STATUS_UPDATE',
    previousStatus,
    newStatus: payload.status,
    adminId: payload.adminId || null,
    note: payload.adminNote || payload.note || null,
  });

  return product;
}

async function updateProductStock(productId, payload = {}) {
  const stock = Number(payload.stock);
  if (Number.isNaN(stock) || stock < 0) throw new Error('Valid stock quantity is required.');

  const product = await Product.findByPk(productId);
  if (!product) throw new Error('Product not found.');

  const previousStock = Number(product.stock || 0);

  await product.update({ stock });

  await ProductAuditLog.create({
    productId: product.id,
    productCode: product.productCode || product.sku || null,
    action: 'STOCK_UPDATE',
    previousStock,
    newStock: stock,
    adminId: payload.adminId || null,
    note: payload.reason || payload.note || 'Stock updated by admin.',
  });

  return product;
}

async function getProductAuditLogs(productId) {
  return ProductAuditLog.findAll({
    where: { productId },
    order: [['createdAt', 'DESC']],
  });
}

module.exports = {
  PRODUCT_STATUSES,
  listAdminProducts,
  updateProductStatus,
  updateProductStock,
  getProductAuditLogs,
};
