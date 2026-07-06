const express = require('express');
const inventoryAnalyticsController = require('../controllers/inventoryAnalyticsController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

const protect = [authMiddleware, roleMiddleware(['Admin', 'Supplier', 'Wholesaler', 'Retailer'])];

router.get('/low-stock-alerts', protect, inventoryAnalyticsController.listLowStockAlerts);
router.get('/low-stock-summary', protect, inventoryAnalyticsController.getLowStockSummary);
router.post('/low-stock/sync', protect, inventoryAnalyticsController.syncLowStockAlerts);
router.patch('/low-stock-alerts/:alertId/resolve', protect, inventoryAnalyticsController.resolveLowStockAlert);

router.get('/forecast', protect, inventoryAnalyticsController.listForecasts);
router.post('/forecast/generate', protect, inventoryAnalyticsController.generateForecasts);
router.get('/forecast/:productId', protect, inventoryAnalyticsController.getProductForecast);

module.exports = router;
