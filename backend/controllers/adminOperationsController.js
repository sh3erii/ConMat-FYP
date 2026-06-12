const adminOperationAuditService = require('../services/adminOperationAuditService');
const adminReportExportService = require('../services/adminReportExportService');
const adminNotificationBridgeService = require('../services/adminNotificationBridgeService');

const sampleProducts = [
  { id: 'PRD-1001', name: 'Cement 50KG', category: 'Cement', sellerName: 'Demo Supplier', city: 'Gujranwala', retailPrice: 1420, wholesalePrice: 1360, stock: 640, status: 'Approved' },
];

const sampleOrders = [
  { id: 'ORD-1007', orderNumber: 'ORD-1007', buyerName: 'Demo Buyer', sellerName: 'Demo Supplier', city: 'Gujranwala', totalAmount: 284000, paymentStatus: 'Paid', orderStatus: 'Processing' },
];

async function getAuditFeed(req, res) {
  try {
    const logs = await adminOperationAuditService.getAuditFeed(req.query);
    return res.status(200).json({ success: true, logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getActionSummary(req, res) {
  try {
    const summary = await adminOperationAuditService.getActionSummary();
    return res.status(200).json({ success: true, summary });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function exportProductReport(req, res) {
  try {
    // Replace sampleProducts with product service result after Rehman's route is connected.
    const csv = adminReportExportService.exportProductsCsv(req.body?.products || sampleProducts);
    await adminOperationAuditService.logAdminOperation({
      adminId: req.user?.id || null,
      moduleName: 'Reports',
      action: 'EXPORT_PRODUCT_REPORT',
      entityType: 'Product',
      summary: 'Admin exported product report CSV.',
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="conmat-product-report.csv"');
    return res.status(200).send(csv);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function exportOrderReport(req, res) {
  try {
    // Replace sampleOrders with order service result after Rehman's route is connected.
    const csv = adminReportExportService.exportOrdersCsv(req.body?.orders || sampleOrders);
    await adminOperationAuditService.logAdminOperation({
      adminId: req.user?.id || null,
      moduleName: 'Reports',
      action: 'EXPORT_ORDER_REPORT',
      entityType: 'Order',
      summary: 'Admin exported order report CSV.',
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="conmat-order-report.csv"');
    return res.status(200).send(csv);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function notifyUser(req, res) {
  try {
    const result = await adminNotificationBridgeService.notifyUserFromAdmin({
      ...req.body,
      adminId: req.user?.id || req.user?.userId || null,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  getAuditFeed,
  getActionSummary,
  exportProductReport,
  exportOrderReport,
  notifyUser,
};
