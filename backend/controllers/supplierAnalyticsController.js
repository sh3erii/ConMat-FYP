const supplierSalesAnalyticsService = require('../services/supplierSalesAnalyticsService');
const productPerformanceService = require('../services/productPerformanceService');

function sendSuccess(res, message, data) {
  return res.status(200).json({ success: true, message, data });
}

function sendError(res, error) {
  return res.status(500).json({ success: false, message: error.message || 'Supplier analytics request failed' });
}

async function getOverview(req, res) {
  try {
    const data = await supplierSalesAnalyticsService.getSupplierOverview(req);
    return sendSuccess(res, 'Supplier overview fetched successfully', data);
  } catch (error) {
    return sendError(res, error);
  }
}

async function getSalesTrend(req, res) {
  try {
    const data = await supplierSalesAnalyticsService.getSalesTrend(req);
    return sendSuccess(res, 'Supplier sales trend fetched successfully', data);
  } catch (error) {
    return sendError(res, error);
  }
}

async function getProductPerformance(req, res) {
  try {
    const data = await productPerformanceService.getProductPerformance(req);
    return sendSuccess(res, 'Product performance fetched successfully', data);
  } catch (error) {
    return sendError(res, error);
  }
}

async function getStockHealth(req, res) {
  try {
    const data = await productPerformanceService.getStockHealth(req);
    return sendSuccess(res, 'Supplier stock health fetched successfully', data);
  } catch (error) {
    return sendError(res, error);
  }
}

async function rebuildSnapshots(req, res) {
  try {
    await supplierSalesAnalyticsService.seedSalesMetrics(req);
    const snapshots = await productPerformanceService.rebuildProductPerformanceSnapshots(req);
    return sendSuccess(res, 'Supplier analytics snapshots rebuilt successfully', { createdSnapshots: snapshots.length });
  } catch (error) {
    return sendError(res, error);
  }
}

module.exports = {
  getOverview,
  getSalesTrend,
  getProductPerformance,
  getStockHealth,
  rebuildSnapshots,
};
