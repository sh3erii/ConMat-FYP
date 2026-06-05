const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const {
  getInventorySummary,
  getLowStockProducts,
  getStockMovements,
  updateProductStock,
  bulkUpdateStock
} = require('../controllers/supplierInventoryController');

router.use(protect);
router.use(authorize('Supplier', 'Wholesaler', 'Retailer', 'Admin'));

router.get('/summary', getInventorySummary);
router.get('/low-stock', getLowStockProducts);
router.get('/movements', getStockMovements);
router.patch('/products/:productId/stock', updateProductStock);
router.post('/bulk-stock', bulkUpdateStock);

module.exports = router;
