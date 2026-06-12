const express = require('express');
const adminOperationsController = require('../controllers/adminOperationsController');

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

router.get('/audit-feed', authMiddleware, adminOperationsController.getAuditFeed);
router.get('/action-summary', authMiddleware, adminOperationsController.getActionSummary);
router.get('/export/products', authMiddleware, adminOperationsController.exportProductReport);
router.get('/export/orders', authMiddleware, adminOperationsController.exportOrderReport);
router.post('/notify-user', authMiddleware, adminOperationsController.notifyUser);

module.exports = router;
