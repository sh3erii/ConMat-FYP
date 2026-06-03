// ============================================================
//  routes/bidRoutes.js  (Muhammad Nosherwan – 076926)
//  Day 4 – Complete bidding routes
// ============================================================
const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const {
  createBidRequest,
  getOpenBidRequests,
  getMyBidRequests,
  getMyBidOffers,
  submitBidOffer,
  getOffersForRequest,
  cancelMyBidOffer,
  acceptBidOffer,
  cancelBidRequest,
  getBiddingDashboard
} = require('../controllers/bidController');

router.use(protect);

router.get('/dashboard', authorize('Supplier', 'Wholesaler', 'Retailer', 'Admin'), getBiddingDashboard);

router.post('/requests', authorize('Wholesaler', 'Retailer', 'Admin'), createBidRequest);
router.get('/requests/open', authorize('Supplier', 'Wholesaler', 'Retailer', 'Admin'), getOpenBidRequests);
router.get('/requests/mine', authorize('Wholesaler', 'Retailer', 'Admin'), getMyBidRequests);
router.get('/requests/:requestId/offers', authorize('Wholesaler', 'Retailer', 'Admin'), getOffersForRequest);
router.patch('/requests/:requestId/cancel', authorize('Wholesaler', 'Retailer', 'Admin'), cancelBidRequest);

router.get('/offers/mine', authorize('Supplier', 'Wholesaler', 'Retailer', 'Admin'), getMyBidOffers);
router.post('/offers', authorize('Supplier', 'Wholesaler', 'Retailer', 'Admin'), submitBidOffer);
router.patch('/offers/:offerId/cancel', authorize('Supplier', 'Wholesaler', 'Retailer', 'Admin'), cancelMyBidOffer);
router.patch('/offers/:offerId/accept', authorize('Wholesaler', 'Retailer', 'Admin'), acceptBidOffer);

module.exports = router;
