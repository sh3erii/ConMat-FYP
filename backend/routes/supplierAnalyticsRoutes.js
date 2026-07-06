const express = require('express');
const supplierAnalyticsController = require('../controllers/supplierAnalyticsController');

const router = express.Router();

// Add authMiddleware and roleMiddleware when your shared middleware is ready.
// Example:
// const authMiddleware = require('../middleware/authMiddleware');
// const roleMiddleware = require('../middleware/roleMiddleware');
// router.use(authMiddleware, roleMiddleware(['Supplier', 'Wholesaler', 'Retailer']));

router.get('/overview', supplierAnalyticsController.getOverview);
router.get('/sales-trend', supplierAnalyticsController.getSalesTrend);
router.get('/product-performance', supplierAnalyticsController.getProductPerformance);
router.get('/stock-health', supplierAnalyticsController.getStockHealth);
router.post('/snapshots/rebuild', supplierAnalyticsController.rebuildSnapshots);

module.exports = router;
