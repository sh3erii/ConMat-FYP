const express = require('express');
const finalDemoController = require('../controllers/finalDemoController');

const router = express.Router();

router.get('/smoke', finalDemoController.smoke);
router.get('/payment-bidding-notification-check', finalDemoController.paymentBiddingNotificationCheck);
router.get('/viva-flow', finalDemoController.vivaFlow);

module.exports = router;
