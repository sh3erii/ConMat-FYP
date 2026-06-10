// ============================================================
//  routes/adminVerificationRoutes.js  (Muhammad Nosherwan – 076926)
//  Day 7 – admin verification/reporting routes
// ============================================================
const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const {
  getDashboardSummary,
  getSellerApplications,
  approveSeller,
  rejectSeller,
  getUsers,
  updateUserStatus,
  getPlatformReport,
  getSellerVerificationReport,
  getBiddingReportController
} = require('../controllers/adminVerificationController');

const adminOnly = authorize('Admin');

router.get('/dashboard-summary', protect, adminOnly, getDashboardSummary);
router.get('/seller-applications', protect, adminOnly, getSellerApplications);
router.put('/seller-applications/:userId/approve', protect, adminOnly, approveSeller);
router.put('/seller-applications/:userId/reject', protect, adminOnly, rejectSeller);
router.get('/users', protect, adminOnly, getUsers);
router.put('/users/:userId/status', protect, adminOnly, updateUserStatus);
router.get('/reports/platform', protect, adminOnly, getPlatformReport);
router.get('/reports/sellers', protect, adminOnly, getSellerVerificationReport);
router.get('/reports/bidding', protect, adminOnly, getBiddingReportController);

module.exports = router;
