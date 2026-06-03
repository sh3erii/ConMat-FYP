// ============================================================
//  routes/adminRoutes.js  (Muhammad Nosherwan – 076926)
//  Day 3 – Admin reporting and verification routes
// ============================================================
const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const {
  getDashboardSummary,
  getPendingSellers,
  listUsers,
  updateSellerVerification,
  updateUserStatus,
  getSalesReport,
  getBidReport
} = require('../controllers/adminController');

router.use(protect);
router.use(authorize('Admin'));

router.get('/summary', getDashboardSummary);
router.get('/sellers/pending', getPendingSellers);
router.patch('/sellers/:id/verification', updateSellerVerification);
router.get('/users', listUsers);
router.patch('/users/:id/status', updateUserStatus);
router.get('/reports/sales', getSalesReport);
router.get('/reports/bids', getBidReport);

module.exports = router;
