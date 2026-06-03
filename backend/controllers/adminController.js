// ============================================================
//  controllers/adminController.js  (Muhammad Nosherwan – 076926)
//  Day 3 – Admin dashboard, seller verification and reports
// ============================================================
const { Op } = require('sequelize');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Payment = require('../models/Payment');
const { Bid, BidOffer } = require('../models/Bid');
const Notification = require('../models/Notification');
const { sendVerificationResult } = require('../services/emailService');

const sellerRoles = ['Supplier', 'Wholesaler', 'Retailer'];

const safeCount = async (model, where = {}) => {
  try { return await model.count({ where }); }
  catch (error) { console.warn('Report count skipped:', error.message); return 0; }
};

const safeSum = async (model, field, where = {}) => {
  try { return Number(await model.sum(field, { where }) || 0); }
  catch (error) { console.warn('Report sum skipped:', error.message); return 0; }
};

const getDashboardSummary = async (req, res) => {
  try {
    const [
      users,
      pendingSellers,
      activeProducts,
      orders,
      openBids,
      successfulPayments,
      revenue,
      unreadNotifications
    ] = await Promise.all([
      safeCount(User),
      safeCount(User, { role: { [Op.in]: sellerRoles }, status: 'Pending' }),
      safeCount(Product, { status: 'Active' }),
      safeCount(Order),
      safeCount(Bid, { requestStatus: 'Open' }),
      safeCount(Payment, { status: 'success' }),
      safeSum(Payment, 'amount', { status: 'success' }),
      safeCount(Notification, { isRead: false })
    ]);

    return res.status(200).json({
      success: true,
      summary: {
        users,
        pendingSellers,
        activeProducts,
        orders,
        openBids,
        successfulPayments,
        revenue,
        unreadNotifications
      }
    });
  } catch (error) {
    console.error('Admin Summary Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while loading admin summary.' });
  }
};

const getPendingSellers = async (req, res) => {
  try {
    const sellers = await User.findAll({
      where: { role: { [Op.in]: sellerRoles }, status: 'Pending' },
      attributes: { exclude: ['passwordHash'] },
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({ success: true, count: sellers.length, sellers });
  } catch (error) {
    console.error('Pending Sellers Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching pending sellers.' });
  }
};

const listUsers = async (req, res) => {
  try {
    const { role, status, search } = req.query;
    const where = {};

    if (role && role !== 'All') where.role = role;
    if (status && status !== 'All') where.status = status;
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { companyName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const users = await User.findAll({
      where,
      attributes: { exclude: ['passwordHash'] },
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    console.error('List Users Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching users.' });
  }
};

const updateSellerVerification = async (req, res) => {
  try {
    const { status, reason } = req.body;
    const nextStatus = status === 'Approved' || status === 'Active' ? 'Active' : status;

    if (!['Active', 'Rejected'].includes(nextStatus)) {
      return res.status(400).json({ success: false, message: 'Status must be Active/Approved or Rejected.' });
    }

    const seller = await User.findByPk(req.params.id);
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found.' });
    if (!sellerRoles.includes(seller.role)) {
      return res.status(400).json({ success: false, message: 'Only seller roles can be verified.' });
    }

    await seller.update({ status: nextStatus });

    await Notification.create({
      userId: seller.id,
      title: nextStatus === 'Active' ? 'Seller account approved' : 'Seller account rejected',
      message: nextStatus === 'Active'
        ? 'Your ConMat seller account has been approved. You can now list products.'
        : `Your ConMat seller account has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
      type: 'Verification',
      metadata: { reason: reason || null, updatedBy: req.user.id }
    });

    sendVerificationResult({
      to: seller.email,
      supplierName: seller.name,
      status: nextStatus,
      reason
    }).catch((error) => console.warn('Seller verification email skipped:', error.message));

    return res.status(200).json({
      success: true,
      message: `Seller ${nextStatus === 'Active' ? 'approved' : 'rejected'} successfully.`,
      seller: {
        id: seller.id,
        name: seller.name,
        email: seller.email,
        role: seller.role,
        status: seller.status
      }
    });
  } catch (error) {
    console.error('Seller Verification Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while updating seller verification.' });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Active', 'Pending', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid user status.' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    await user.update({ status });

    await Notification.create({
      userId: user.id,
      title: 'Account status updated',
      message: `Your account status is now ${status}.`,
      type: 'System',
      metadata: { updatedBy: req.user.id }
    });

    return res.status(200).json({ success: true, message: 'User status updated successfully.', user });
  } catch (error) {
    console.error('Update User Status Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while updating user status.' });
  }
};

const getSalesReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateWhere = {};

    if (from || to) {
      dateWhere.createdAt = {};
      if (from) dateWhere.createdAt[Op.gte] = new Date(from);
      if (to) dateWhere.createdAt[Op.lte] = new Date(to);
    }

    const orders = await Order.findAll({ where: dateWhere, order: [['createdAt', 'DESC']] });
    const orderIds = orders.map((order) => order.id);
    const items = orderIds.length ? await OrderItem.findAll({ where: { orderId: { [Op.in]: orderIds } } }) : [];

    const categoryTotals = items.reduce((acc, item) => {
      const category = item.category || 'Other';
      if (!acc[category]) acc[category] = { quantity: 0, revenue: 0 };
      acc[category].quantity += Number(item.quantity || 0);
      acc[category].revenue += Number(item.lineTotal || 0);
      return acc;
    }, {});

    const revenue = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

    return res.status(200).json({
      success: true,
      report: {
        totalOrders: orders.length,
        totalItems: items.length,
        revenue,
        categoryTotals,
        orders
      }
    });
  } catch (error) {
    console.error('Sales Report Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while generating sales report.' });
  }
};

const getBidReport = async (req, res) => {
  try {
    const [open, closed, cancelled, submittedOffers, acceptedOffers] = await Promise.all([
      safeCount(Bid, { requestStatus: 'Open' }),
      safeCount(Bid, { requestStatus: 'Closed' }),
      safeCount(Bid, { requestStatus: 'Cancelled' }),
      safeCount(BidOffer, { status: 'Submitted' }),
      safeCount(BidOffer, { status: 'Accepted' })
    ]);

    return res.status(200).json({
      success: true,
      report: { open, closed, cancelled, submittedOffers, acceptedOffers }
    });
  } catch (error) {
    console.error('Bid Report Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while generating bid report.' });
  }
};

module.exports = {
  getDashboardSummary,
  getPendingSellers,
  listUsers,
  updateSellerVerification,
  updateUserStatus,
  getSalesReport,
  getBidReport
};
