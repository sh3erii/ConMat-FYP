const adminProductManagementService = require('../services/adminProductManagementService');

async function listProducts(req, res) {
  try {
    const data = await adminProductManagementService.listAdminProducts(req.query);
    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function updateStatus(req, res) {
  try {
    const product = await adminProductManagementService.updateProductStatus(req.params.productId, {
      ...req.body,
      adminId: req.user?.id || req.user?.userId || null,
    });
    return res.status(200).json({ success: true, message: 'Product status updated.', product });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function updateStock(req, res) {
  try {
    const product = await adminProductManagementService.updateProductStock(req.params.productId, {
      ...req.body,
      adminId: req.user?.id || req.user?.userId || null,
    });
    return res.status(200).json({ success: true, message: 'Product stock updated.', product });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function getAuditLogs(req, res) {
  try {
    const logs = await adminProductManagementService.getProductAuditLogs(req.params.productId);
    return res.status(200).json({ success: true, logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  listProducts,
  updateStatus,
  updateStock,
  getAuditLogs,
};
