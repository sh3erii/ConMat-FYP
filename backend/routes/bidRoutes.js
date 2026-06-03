// ============================================================
//  routes/bidRoutes.js  (Muhammad Nosherwan – 076926)
//  Day 2 – Bidding routes
// ============================================================
const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const {
  createBidRequest,
  getOpenBidRequests,
  getMyBidRequests,
  submitBidOffer,
  getOffersForRequest,
  cancelMyBidOffer,
  acceptBidOffer
} = require('../controllers/bidController');

router.post('/requests', protect, authorize('Wholesaler', 'Retailer', 'Admin'), createBidRequest);
router.get('/requests/open', protect, authorize('Supplier', 'Wholesaler', 'Retailer', 'Admin'), getOpenBidRequests);
router.get('/requests/mine', protect, authorize('Wholesaler', 'Retailer', 'Admin'), getMyBidRequests);
router.get('/requests/:requestId/offers', protect, authorize('Wholesaler', 'Retailer', 'Admin'), getOffersForRequest);

router.post('/offers', protect, authorize('Supplier', 'Wholesaler', 'Retailer', 'Admin'), submitBidOffer);
router.patch('/offers/:offerId/cancel', protect, authorize('Supplier', 'Wholesaler', 'Retailer', 'Admin'), cancelMyBidOffer);
router.patch('/offers/:offerId/accept', protect, authorize('Wholesaler', 'Retailer', 'Admin'), acceptBidOffer);

module.exports = router;
