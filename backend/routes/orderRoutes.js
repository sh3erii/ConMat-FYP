const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const {
  createOrder,
  getMyOrders,
  getIncomingSellerOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder
} = require('../controllers/orderController');

router.use(protect);

router.post('/', authorize('Customer', 'Retailer', 'Wholesaler', 'Admin'), createOrder);
router.get('/mine', getMyOrders);
router.get('/incoming', authorize('Supplier', 'Wholesaler', 'Retailer', 'Admin'), getIncomingSellerOrders);
router.get('/:id', getOrderById);
router.patch('/:id/status', authorize('Supplier', 'Wholesaler', 'Retailer', 'Admin'), updateOrderStatus);
router.patch('/:id/cancel', cancelOrder);

module.exports = router;
