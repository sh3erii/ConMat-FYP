// ============================================================
//  routes/paymentRoutes.js  (Muhammad Nosherwan – 076926)
//  Day 2 – Payment routes
// ============================================================
const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const {
  createIntent,
  confirmPayment,
  getMyPayments,
  getPaymentById
} = require('../controllers/paymentController');

router.post('/create-intent', protect, authorize('Customer', 'Retailer', 'Wholesaler', 'Admin'), createIntent);
router.post('/confirm', protect, authorize('Customer', 'Retailer', 'Wholesaler', 'Admin'), confirmPayment);
router.get('/my-payments', protect, authorize('Customer', 'Retailer', 'Wholesaler', 'Admin'), getMyPayments);
router.get('/:id', protect, authorize('Customer', 'Retailer', 'Wholesaler', 'Admin'), getPaymentById);

module.exports = router;
