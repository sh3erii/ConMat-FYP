const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const {
  getProductPricingSlabs,
  createPricingSlab,
  updatePricingSlab,
  deletePricingSlab,
  calculateProductPrice,
  compareProducts
} = require('../controllers/pricingController');

// Buyer-side comparison APIs
router.get('/products/compare', compareProducts);
router.post('/calculate', calculateProductPrice);
router.get('/products/:productId/slabs', getProductPricingSlabs);

// Seller/admin pricing slab management
router.post('/products/:productId/slabs', protect, authorize('Supplier', 'Wholesaler', 'Retailer', 'Admin'), createPricingSlab);
router.patch('/slabs/:slabId', protect, authorize('Supplier', 'Wholesaler', 'Retailer', 'Admin'), updatePricingSlab);
router.delete('/slabs/:slabId', protect, authorize('Supplier', 'Wholesaler', 'Retailer', 'Admin'), deletePricingSlab);

module.exports = router;
