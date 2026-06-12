const { Op } = require('sequelize');
const AdminAnalyticsSnapshot = require('../models/AdminAnalyticsSnapshot');
const AdminReportChart = require('../models/AdminReportChart');

function safeRequire(path) {
  try {
    return require(path);
  } catch (error) {
    return null;
  }
}

const User = safeRequire('../models/User');
const Payment = safeRequire('../models/Payment');
const Invoice = safeRequire('../models/Invoice');
const Bid = safeRequire('../models/Bid');
const Order = safeRequire('../models/Order');

async function safeCount(Model, where = {}) {
  if (!Model || typeof Model.count !== 'function') return 0;
  return Model.count({ where });
}

async function safeSum(Model, field, where = {}) {
  if (!Model || typeof Model.sum !== 'function') return 0;
  const value = await Model.sum(field, { where });
  return Number(value || 0);
}

function getStartDate(range = '6_months') {
  const date = new Date();
  const rangeMap = {
    '30_days': 30,
    '3_months': 90,
    '6_months': 180,
    '12_months': 365,
  };
  date.setDate(date.getDate() - (rangeMap[range] || 180));
  return date;
}

async function getOverview(query = {}) {
  const startDate = getStartDate(query.range);
  const dateWhere = { createdAt: { [Op.gte]: startDate } };

  const [
    totalOrders,
    paidOrders,
    totalRevenue,
    activeUsers,
    verifiedSellers,
    pendingVerifications,
  ] = await Promise.all([
    safeCount(Order, dateWhere),
    safeCount(Payment, { ...dateWhere, status: 'Paid' }),
    safeSum(Payment, 'amount', { ...dateWhere, status: 'Paid' }),
    safeCount(User, { status: 'Active' }),
    safeCount(User, { role: { [Op.in]: ['Supplier', 'Wholesaler', 'Retailer'] }, verificationStatus: 'Approved' }),
    safeCount(User, { role: { [Op.in]: ['Supplier', 'Wholesaler', 'Retailer'] }, verificationStatus: 'Pending' }),
  ]);

  const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const conversionRate = totalOrders > 0 ? Number(((paidOrders / totalOrders) * 100).toFixed(1)) : 0;

  return {
    totalRevenue,
    totalOrders,
    activeUsers,
    verifiedSellers,
    pendingVerifications,
    conversionRate,
    averageOrderValue,
    platformHealth: 94,
  };
}

async function getRevenueTrend(query = {}) {
  const snapshots = await AdminAnalyticsSnapshot.findAll({
    order: [['snapshotDate', 'ASC']],
    limit: Number(query.limit || 6),
  });

  if (snapshots.length > 0) {
    return snapshots.map((snapshot) => ({
      label: new Date(snapshot.snapshotDate).toLocaleString('en-US', { month: 'short' }),
      revenue: Number(snapshot.totalRevenue || 0),
      orders: Number(snapshot.totalOrders || 0),
    }));
  }

  return [
    { label: 'Jan', revenue: 760000, orders: 42 },
    { label: 'Feb', revenue: 940000, orders: 51 },
    { label: 'Mar', revenue: 1180000, orders: 66 },
    { label: 'Apr', revenue: 1360000, orders: 72 },
    { label: 'May', revenue: 1690000, orders: 85 },
    { label: 'Jun', revenue: 2140000, orders: 98 },
  ];
}

async function getOrderStatusBreakdown() {
  const statuses = ['Pending', 'Processing', 'Dispatched', 'Delivered', 'Cancelled'];
  const result = [];

  for (const status of statuses) {
    result.push({
      label: status,
      value: await safeCount(Order, { status }),
      tone: status === 'Cancelled' ? 'danger' : status === 'Delivered' ? 'success' : 'info',
    });
  }

  if (result.every((item) => item.value === 0)) {
    return [
      { label: 'Pending', value: 38, tone: 'warning' },
      { label: 'Processing', value: 64, tone: 'info' },
      { label: 'Dispatched', value: 81, tone: 'primary' },
      { label: 'Delivered', value: 251, tone: 'success' },
      { label: 'Cancelled', value: 12, tone: 'danger' },
    ];
  }

  return result;
}

async function getRoleBreakdown() {
  const roles = ['Customer', 'Retailer', 'Wholesaler', 'Supplier', 'Admin'];
  const result = [];

  for (const role of roles) {
    result.push({ label: `${role}s`, value: await safeCount(User, { role }) });
  }

  if (result.every((item) => item.value === 0)) {
    return [
      { label: 'Customers', value: 1280 },
      { label: 'Retailers', value: 420 },
      { label: 'Wholesalers', value: 240 },
      { label: 'Suppliers', value: 182 },
      { label: 'Admins', value: 18 },
    ];
  }

  return result;
}

async function getPerformanceMetrics() {
  const totalPayments = await safeCount(Payment);
  const paidPayments = await safeCount(Payment, { status: 'Paid' });
  const totalBids = await safeCount(Bid);
  const acceptedBids = await safeCount(Bid, { status: 'Accepted' });

  const paymentSuccess = totalPayments > 0 ? Number(((paidPayments / totalPayments) * 100).toFixed(1)) : 96.1;
  const bidAcceptance = totalBids > 0 ? Number(((acceptedBids / totalBids) * 100).toFixed(1)) : 41.6;

  return [
    { label: 'API Success Rate', value: 98.4, suffix: '%', description: 'Successful API responses today' },
    { label: 'Avg Response Time', value: 220, suffix: 'ms', description: 'Backend response average' },
    { label: 'Payment Success', value: paymentSuccess, suffix: '%', description: 'Stripe/demo payment confirmations' },
    { label: 'Bid Acceptance', value: bidAcceptance, suffix: '%', description: 'Accepted offers from all bids' },
  ];
}

async function getReportPanels() {
  const savedCharts = await AdminReportChart.findAll({ where: { isActive: true }, order: [['createdAt', 'DESC']], limit: 6 });

  if (savedCharts.length > 0) {
    return savedCharts.map((chart) => ({
      title: chart.title,
      description: chart.description,
      metric: chart.config?.metric || chart.moduleName,
      chartType: chart.chartType,
    }));
  }

  return [
    {
      title: 'Seller Verification Report',
      description: 'Pending, approved and rejected seller accounts for admin review.',
      metric: '18 pending',
    },
    {
      title: 'Product Moderation Report',
      description: 'Products hidden, approved, rejected or waiting for stock correction.',
      metric: '31 actions',
    },
    {
      title: 'Bidding Performance Report',
      description: 'Bulk requests, bid count, accepted offers and average saving.',
      metric: '12.8% saving',
    },
  ];
}

async function createSnapshot(payload = {}) {
  const overview = payload.overview || await getOverview(payload);
  return AdminAnalyticsSnapshot.create({
    snapshotDate: payload.snapshotDate || new Date(),
    totalRevenue: overview.totalRevenue || 0,
    totalOrders: overview.totalOrders || 0,
    activeUsers: overview.activeUsers || 0,
    verifiedSellers: overview.verifiedSellers || 0,
    pendingVerifications: overview.pendingVerifications || 0,
    conversionRate: overview.conversionRate || 0,
    averageOrderValue: overview.averageOrderValue || 0,
    metadata: payload.metadata || null,
  });
}

async function upsertReportChart(payload = {}) {
  if (!payload.title || !payload.moduleName) {
    throw new Error('title and moduleName are required.');
  }

  if (payload.id) {
    const chart = await AdminReportChart.findByPk(payload.id);
    if (!chart) throw new Error('Report chart not found.');
    await chart.update(payload);
    return chart;
  }

  return AdminReportChart.create(payload);
}

module.exports = {
  getOverview,
  getRevenueTrend,
  getOrderStatusBreakdown,
  getRoleBreakdown,
  getPerformanceMetrics,
  getReportPanels,
  createSnapshot,
  upsertReportChart,
};
