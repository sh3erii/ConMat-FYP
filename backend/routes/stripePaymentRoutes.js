const express = require('express');
const stripePaymentController = require('../controllers/stripePaymentController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.post(
  '/create-intent',
  authMiddleware,
  roleMiddleware(['Customer', 'Retailer', 'Wholesaler', 'Admin']),
  stripePaymentController.createPaymentIntent
);

router.post(
  '/confirm-demo',
  authMiddleware,
  roleMiddleware(['Customer', 'Retailer', 'Wholesaler', 'Admin']),
  stripePaymentController.confirmDemoPayment
);

router.post('/webhook', stripePaymentController.handleStripeWebhook);

module.exports = router;
