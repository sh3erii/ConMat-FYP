const express = require('express');
const adminProductManagementController = require('../controllers/adminProductManagementController');

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

router.get('/products', authMiddleware, adminProductManagementController.listProducts);
router.patch('/products/:productId/status', authMiddleware, adminProductManagementController.updateStatus);
router.patch('/products/:productId/stock', authMiddleware, adminProductManagementController.updateStock);
router.get('/products/:productId/audit-logs', authMiddleware, adminProductManagementController.getAuditLogs);

module.exports = router;
