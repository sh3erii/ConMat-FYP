const { Op } = require('sequelize');
const LowStockAlert = require('../models/LowStockAlert');

let Product;
try {
  Product = require('../models/Product');
} catch (error) {
  Product = null;
}

function getSeverity(currentStock, threshold) {
  if (currentStock <= 0) return 'Critical';
  if (currentStock <= Math.ceil(threshold * 0.35)) return 'High';
  if (currentStock <= Math.ceil(threshold * 0.7)) return 'Medium';
  return 'Low';
}

function getRecommendedAction(productName, currentStock, threshold) {
  const required = Math.max(threshold - currentStock, 0);
  return `Restock ${required} units of ${productName} to reach the minimum threshold of ${threshold}.`;
}

async function listLowStockAlerts(query = {}) {
  const where = {};
  if (query.status) where.status = query.status;
  if (query.severity) where.severity = query.severity;
  if (query.sellerId) where.sellerId = query.sellerId;

  const alerts = await LowStockAlert.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: Number(query.limit || 50),
  });

  return alerts;
}

async function syncLowStockAlerts(options = {}) {
  if (!Product) {
    return {
      created: 0,
      updated: 0,
      message: 'Product model not found. Add Product model before syncing low-stock alerts.',
    };
  }

  const thresholdField = options.thresholdField || 'lowStockThreshold';
  const stockField = options.stockField || 'stockQuantity';

  const products = await Product.findAll({
    where: {
      [stockField]: {
        [Op.lte]: Number(options.defaultThreshold || 50),
      },
    },
    limit: Number(options.limit || 200),
  });

  let created = 0;
  let updated = 0;

  for (const product of products) {
    const currentStock = Number(product[stockField] ?? product.stock ?? 0);
    const threshold = Number(product[thresholdField] ?? options.defaultThreshold ?? 50);
    if (currentStock > threshold) continue;

    const productName = product.name || product.productName || 'Construction Material';
    const payload = {
      productId: product.id,
      sellerId: product.sellerId || product.supplierId || null,
      productName,
      sku: product.sku || product.productCode || null,
      currentStock,
      threshold,
      severity: getSeverity(currentStock, threshold),
      status: 'Open',
      recommendedAction: getRecommendedAction(productName, currentStock, threshold),
    };

    const [alert, wasCreated] = await LowStockAlert.findOrCreate({
      where: { productId: product.id, status: 'Open' },
      defaults: payload,
    });

    if (wasCreated) {
      created += 1;
    } else {
      await alert.update(payload);
      updated += 1;
    }
  }

  return { created, updated, totalChecked: products.length };
}

async function resolveLowStockAlert(alertId, payload = {}) {
  const alert = await LowStockAlert.findByPk(alertId);
  if (!alert) throw new Error('Low stock alert not found.');

  await alert.update({
    status: payload.status || 'Resolved',
    resolvedBy: payload.resolvedBy || null,
    resolvedAt: new Date(),
    recommendedAction: payload.note || alert.recommendedAction,
  });

  return alert;
}

async function getLowStockSummary() {
  const [open, critical, high] = await Promise.all([
    LowStockAlert.count({ where: { status: 'Open' } }),
    LowStockAlert.count({ where: { status: 'Open', severity: 'Critical' } }),
    LowStockAlert.count({ where: { status: 'Open', severity: 'High' } }),
  ]);

  return { open, critical, high };
}

module.exports = {
  listLowStockAlerts,
  syncLowStockAlerts,
  resolveLowStockAlert,
  getLowStockSummary,
};
