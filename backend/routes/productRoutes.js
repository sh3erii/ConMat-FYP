const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');
const {
  listProducts,
  getProductById,
  getMyProducts,
  createProduct,
  updateProduct,
  updateStock,
  deleteProduct
} = require('../controllers/productController');

// Public marketplace browsing
router.get('/', listProducts);

// Seller inventory routes must be above /:id
router.get('/mine', protect, authorize('Supplier', 'Wholesaler', 'Retailer', 'Admin'), getMyProducts);
router.post('/', protect, authorize('Supplier', 'Wholesaler', 'Retailer', 'Admin'), upload.single('image'), createProduct);

// Public product detail
router.get('/:id', getProductById);

// Seller management
router.put('/:id', protect, authorize('Supplier', 'Wholesaler', 'Retailer', 'Admin'), upload.single('image'), updateProduct);
router.patch('/:id/stock', protect, authorize('Supplier', 'Wholesaler', 'Retailer', 'Admin'), updateStock);
router.delete('/:id', protect, authorize('Supplier', 'Wholesaler', 'Retailer', 'Admin'), deleteProduct);

module.exports = router;
