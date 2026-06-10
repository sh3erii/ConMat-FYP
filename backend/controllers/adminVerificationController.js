// ============================================================
//  controllers/adminVerificationController.js  (Muhammad Nosherwan – 076926)
//  Day 7 – admin seller verification, user control and reports
// ============================================================
const { Op } = require('sequelize');
const User = require('../models/User');
const { createAdminAudit } = require('../services/adminAuditService');
const { getPlatformSummary, getSellerReport, getBiddingReport } = require('../services/adminReportService');

const sellerRoles = ['Supplier', 'Wholesaler', 'Retailer'];
const adminId = (req) => req.user?.id || req.user?.userId;

const buildUserSearchOr = (search) => {
  if (!search) return null;
  const fields = ['name', 'email', 'companyName', 'businessName', 'city'].filter((field) => User.rawAttributes[field]);
  return fields.map((field) => ({ [field]: { [Op.iLike]: `%${search}%` } }));
};

const getDashboardSummary = async (req, res) => {
  try {
    const summary = await getPlatformSummary();
    return res.status(200).json({
      success: true,
      kpis: [
        { id: 'pending-sellers', label: 'Pending Sellers', value: summary.pendingSellers, helper: 'Awaiting verification', trend: 'Review today' },
        { id: 'verified-sellers', label: 'Verified Sellers', value: summary.verifiedSellers, helper: 'Approved seller network', trend: 'Trusted sellers' },
        { id: 'total-users', label: 'Total Users', value: summary.totalUsers, helper: 'All platform accounts', trend: 'RBAC enabled' },
        { id: 'active-bids', label: 'Active Bids', value: summary.activeBids, helper: 'Bulk buying requests/offers', trend: 'Bidding module' }
      ],
      summary
    });
  } catch (error) {
    console.error('Admin Summary Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while generating admin summary.' });
  }
};

const getSellerApplications = async (req, res) => {
  try {
    const { status = 'Pending', search = '' } = req.query;
    const where = {
      role: { [Op.in]: sellerRoles }
    };

    if (status !== 'All') where.status = status;
    if (search) {
      const searchOr = buildUserSearchOr(search);
      if (searchOr?.length) where[Op.or] = searchOr;
    }

    const applications = await User.findAll({ where, order: [['createdAt', 'DESC']] });
    return res.status(200).json({ success: true, applications });
  } catch (error) {
    console.error('Seller Applications Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching seller applications.' });
  }
};

const approveSeller = async (req, res) => {
  try {
    const seller = await User.findByPk(req.params.userId);
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found.' });
    if (!sellerRoles.includes(seller.role)) {
      return res.status(400).json({ success: false, message: 'Only seller roles can be verified.' });
    }

    await seller.update({ status: 'Active' });
    await createAdminAudit({
      adminId: adminId(req),
      targetUserId: seller.id,
      action: 'Seller Approved',
      message: `Your ${seller.role} account has been approved by ConMat admin.`,
      metadata: { note: req.body.note || '' }
    });

    return res.status(200).json({ success: true, message: 'Seller approved successfully.', seller });
  } catch (error) {
    console.error('Approve Seller Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while approving seller.' });
  }
};

const rejectSeller = async (req, res) => {
  try {
    const seller = await User.findByPk(req.params.userId);
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found.' });

    const reason = req.body.reason || 'Verification documents were not accepted.';
    await seller.update({ status: 'Rejected' });
    await createAdminAudit({
      adminId: adminId(req),
      targetUserId: seller.id,
      action: 'Seller Rejected',
      message: reason,
      metadata: { reason }
    });

    return res.status(200).json({ success: true, message: 'Seller rejected successfully.', seller });
  } catch (error) {
    console.error('Reject Seller Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while rejecting seller.' });
  }
};

const getUsers = async (req, res) => {
  try {
    const { role = 'All', status = 'All', search = '' } = req.query;
    const where = {};
    if (role !== 'All') where.role = role;
    if (status !== 'All') where.status = status;
    if (search) {
      const searchOr = buildUserSearchOr(search);
      if (searchOr?.length) where[Op.or] = searchOr;
    }

    const users = await User.findAll({ where, order: [['createdAt', 'DESC']] });
    const sanitized = users.map((user) => {
      const plain = user.toJSON ? user.toJSON() : user;
      delete plain.password;
      delete plain.passwordHash;
      return plain;
    });

    return res.status(200).json({ success: true, users: sanitized });
  } catch (error) {
    console.error('Get Users Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching users.' });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { status, reason = '' } = req.body;
    if (!['Active', 'Pending', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be Active, Pending or Rejected.' });
    }

    const user = await User.findByPk(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.role === 'Admin' && String(user.id) === String(adminId(req))) {
      return res.status(400).json({ success: false, message: 'Admin cannot change their own status.' });
    }

    await user.update({ status });
    await createAdminAudit({
      adminId: adminId(req),
      targetUserId: user.id,
      action: `Account ${status}`,
      message: reason || `Your account status has been changed to ${status}.`,
      metadata: { status, reason }
    });

    return res.status(200).json({ success: true, message: `User status updated to ${status}.`, user });
  } catch (error) {
    console.error('Update User Status Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while updating user status.' });
  }
};

const getPlatformReport = async (req, res) => {
  try {
    const summary = await getPlatformSummary();
    return res.status(200).json({ success: true, summary });
  } catch (error) {
    console.error('Platform Report Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while generating platform report.' });
  }
};

const getSellerVerificationReport = async (req, res) => {
  try {
    const report = await getSellerReport();
    return res.status(200).json({ success: true, report });
  } catch (error) {
    console.error('Seller Report Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while generating seller report.' });
  }
};

const getBiddingReportController = async (req, res) => {
  try {
    const report = await getBiddingReport();
    return res.status(200).json({ success: true, report });
  } catch (error) {
    console.error('Bidding Report Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while generating bidding report.' });
  }
};

module.exports = {
  getDashboardSummary,
  getSellerApplications,
  approveSeller,
  rejectSeller,
  getUsers,
  updateUserStatus,
  getPlatformReport,
  getSellerVerificationReport,
  getBiddingReportController
};
