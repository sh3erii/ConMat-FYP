// ============================================================
//  routes/bidConversionRoutes.js  (Muhammad Nosherwan – 076926)
//  Day 6 – Bid analytics and accepted bid conversion routes
// ============================================================
const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const {
  getBidAnalyticsSummary,
  getBidDecisionMatrix,
  convertAcceptedBidToOrder
} = require('../controllers/bidConversionController');

router.use(protect);

router.get('/analytics/summary', authorize('Wholesaler', 'Retailer', 'Admin'), getBidAnalyticsSummary);
router.get('/requests/:requestId/decision-matrix', authorize('Wholesaler', 'Retailer', 'Admin'), getBidDecisionMatrix);
router.post('/offers/:offerId/convert-to-order', authorize('Wholesaler', 'Retailer', 'Admin'), convertAcceptedBidToOrder);

module.exports = router;
