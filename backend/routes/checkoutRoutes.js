const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const checkoutController = require('../controllers/checkoutController');

const buyerRoles = ['Customer', 'Retailer', 'Wholesaler', 'Supplier', 'Admin'];

router.use(protect);
router.use(authorize(...buyerRoles));

router.post('/orders', checkoutController.createCheckoutOrder);
router.get('/orders/my', checkoutController.getMyCheckoutOrders);
router.get('/orders/:orderId', checkoutController.getCheckoutOrderDetail);
router.patch('/orders/:orderId/cancel', checkoutController.cancelCheckoutOrder);
router.get('/orders/:orderId/status-history', checkoutController.getOrderStatusHistory);

module.exports = router;
