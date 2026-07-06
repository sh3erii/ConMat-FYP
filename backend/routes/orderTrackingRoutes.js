const express = require('express');
const router = express.Router();
const orderTrackingController = require('../controllers/orderTrackingController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.get('/:orderIdOrNumber', authMiddleware, orderTrackingController.listOrderTracking);

router.post(
  '/',
  authMiddleware,
  roleMiddleware(['Admin', 'Supplier', 'Wholesaler', 'Retailer']),
  orderTrackingController.createOrderTracking
);

router.post(
  '/:orderId/status',
  authMiddleware,
  roleMiddleware(['Admin', 'Supplier']),
  orderTrackingController.addStatusUpdate
);

module.exports = router;
