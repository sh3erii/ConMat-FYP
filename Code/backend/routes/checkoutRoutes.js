const router = require('express').Router();
const controller = require('../controllers/orderController');
const protect = require('../middleware/authMiddleware');

router.use(protect);
router.post('/orders', controller.createCheckoutOrder);
router.get('/orders/my', controller.getMyOrders);
router.get('/orders/:orderId', controller.getOrderDetail);
router.patch('/orders/:orderId/cancel', controller.cancelOrder);
router.post('/orders/:orderId/items/:itemId/confirm-delivery', controller.confirmItemDelivery);
router.post('/orders/:orderId/items/:itemId/report-issue', controller.reportItemIssue);
router.post('/orders/:orderId/confirm-delivery', controller.confirmDelivery);
router.post('/orders/:orderId/report-issue', controller.reportOrderIssue);

module.exports = router;
