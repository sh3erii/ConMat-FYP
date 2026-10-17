const router = require('express').Router();
const controller = require('../controllers/orderController');
const protect = require('../middleware/authMiddleware');

router.use(protect);
router.get('/incoming', controller.incoming);
router.get('/:orderId/payment-summary', controller.paymentSummary);
router.patch('/:orderId/items/:itemId/status', controller.updateItemStatus);
router.patch('/:orderId/status', controller.updateStatus);

module.exports = router;
