const express = require('express');
const orderPaymentStatusController = require('../controllers/orderPaymentStatusController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/:orderNumber/logs', authMiddleware, orderPaymentStatusController.listStatusLogs);

router.post(
  '/logs',
  authMiddleware,
  roleMiddleware(['Admin', 'Supplier', 'Wholesaler', 'Retailer', 'Customer']),
  orderPaymentStatusController.createStatusLog
);

router.post(
  '/mark-paid',
  authMiddleware,
  roleMiddleware(['Admin', 'Supplier']),
  orderPaymentStatusController.confirmOrderPaid
);

router.post(
  '/mark-failed',
  authMiddleware,
  roleMiddleware(['Admin', 'Supplier']),
  orderPaymentStatusController.confirmOrderPaymentFailed
);

module.exports = router;
