// ============================================================
//  services/adminReportService.js  (Muhammad Nosherwan – 076926)
//  Day 7 – admin platform report helpers
// ============================================================
const { Op } = require('sequelize');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { Bid } = require('../models/Bid');

const safeCount = async (model, where = {}) => {
  try {
    return await model.count({ where });
  } catch (error) {
    console.error('Report count skipped:', error.message);
    return 0;
  }
};

const getPlatformSummary = async () => {
  const [totalUsers, pendingSellers, verifiedSellers, totalProducts, totalOrders, activeBids] = await Promise.all([
    safeCount(User),
    safeCount(User, { role: { [Op.in]: ['Supplier', 'Wholesaler', 'Retailer'] }, status: 'Pending' }),
    safeCount(User, { role: { [Op.in]: ['Supplier', 'Wholesaler', 'Retailer'] }, status: 'Active' }),
    safeCount(Product),
    safeCount(Order),
    safeCount(Bid, { requestStatus: 'Open' })
  ]);

  return {
    totalUsers,
    pendingSellers,
    verifiedSellers,
    totalProducts,
    totalOrders,
    activeBids
  };
};

const getSellerReport = async () => {
  const [pending, verified, rejected, suspended] = await Promise.all([
    safeCount(User, { role: { [Op.in]: ['Supplier', 'Wholesaler', 'Retailer'] }, status: 'Pending' }),
    safeCount(User, { role: { [Op.in]: ['Supplier', 'Wholesaler', 'Retailer'] }, status: 'Active' }),
    safeCount(User, { role: { [Op.in]: ['Supplier', 'Wholesaler', 'Retailer'] }, status: 'Rejected' }),
    safeCount(User, { status: 'Pending' })
  ]);

  return { pending, verified, rejected, suspended: pending }; // suspended shown as pending-review with current User.status enum
};

const getBiddingReport = async () => {
  const [open, accepted, cancelled] = await Promise.all([
    safeCount(Bid, { requestStatus: 'Open' }),
    safeCount(Bid, { requestStatus: 'Closed' }),
    safeCount(Bid, { requestStatus: 'Cancelled' })
  ]);

  return { open, accepted, cancelled };
};

module.exports = {
  getPlatformSummary,
  getSellerReport,
  getBiddingReport
};
