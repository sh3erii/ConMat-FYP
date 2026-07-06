const express = require('express');
const adminOrderManagementController = require('../controllers/adminOrderManagementController');

const router = express.Router();

function optionalMiddleware(path, exportName) {
  try {
    const middlewareModule = require(path);
    return middlewareModule[exportName] || middlewareModule.default || middlewareModule;
  } catch (error) {
    return (req, res, next) => next();
  }
}

const authMiddleware = optionalMiddleware('../middleware/authMiddleware', 'protect');

router.get('/orders', authMiddleware, adminOrderManagementController.listOrders);
router.patch('/orders/:orderId/status', authMiddleware, adminOrderManagementController.updateStatus);
router.get('/orders/:orderId/timeline', authMiddleware, adminOrderManagementController.getTimeline);

module.exports = router;
