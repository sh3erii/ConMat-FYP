const express = require('express');
const adminAnalyticsReportController = require('../controllers/adminAnalyticsReportController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

const adminOnly = [authMiddleware, roleMiddleware(['Admin'])];

router.get('/overview', adminOnly, adminAnalyticsReportController.overview);
router.get('/revenue-trend', adminOnly, adminAnalyticsReportController.revenueTrend);
router.get('/order-status', adminOnly, adminAnalyticsReportController.orderStatus);
router.get('/role-breakdown', adminOnly, adminAnalyticsReportController.roleBreakdown);
router.get('/performance', adminOnly, adminAnalyticsReportController.performance);
router.get('/report-panels', adminOnly, adminAnalyticsReportController.reportPanels);

router.post('/snapshots', adminOnly, adminAnalyticsReportController.createSnapshot);
router.post('/report-charts', adminOnly, adminAnalyticsReportController.saveReportChart);

module.exports = router;
