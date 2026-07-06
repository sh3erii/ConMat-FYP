const adminOrderManagementService = require('../services/adminOrderManagementService');

async function listOrders(req, res) {
  try {
    const data = await adminOrderManagementService.listAdminOrders(req.query);
    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function updateStatus(req, res) {
  try {
    const order = await adminOrderManagementService.updateOrderStatus(req.params.orderId, {
      ...req.body,
      adminId: req.user?.id || req.user?.userId || null,
    });
    return res.status(200).json({ success: true, message: 'Order status updated.', order });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function getTimeline(req, res) {
  try {
    const data = await adminOrderManagementService.getOrderAdminTimeline(req.params.orderId);
    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
}

module.exports = {
  listOrders,
  updateStatus,
  getTimeline,
};
