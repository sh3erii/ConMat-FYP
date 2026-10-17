const { Op } = require('sequelize');
const { Order, OrderItem, SellerPayout, User } = require('../models');
const { number } = require('./formatters');

const REPORT_TYPES_BY_ROLE = {
  Customer: ['buying'],
  Retailer: ['selling'],
  Wholesaler: ['buying', 'selling', 'combined'],
  Supplier: ['selling'],
  Admin: ['platform'],
};

const ORDER_STATUSES = ['Placed', 'Confirmed', 'Processing', 'Packed', 'Dispatched', 'Delivered', 'Payment Issue', 'Cancelled'];
const PAYMENT_STATUSES = ['Pending', 'Paid', 'Failed', 'Refunded'];
const PERIODS = ['all', 'today', 'day', 'month', 'custom'];

function reportError(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function parseDate(value, label) {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) throw reportError(`${label} is invalid.`);
  return parsed;
}

function resolveDateRange(query = {}, now = new Date()) {
  const period = String(query.period || 'all');
  if (!PERIODS.includes(period)) throw reportError('Invalid report period.');
  let from = query.from ? parseDate(query.from, 'Start date and time') : null;
  let to = query.to ? parseDate(query.to, 'End date and time') : null;

  if (!from && !to && period === 'today') {
    const pakistanDate = new Date(now.getTime() + (5 * 60 * 60 * 1000)).toISOString().slice(0, 10);
    from = parseDate(`${pakistanDate}T00:00:00+05:00`, 'Report date');
    to = new Date(from.getTime() + (24 * 60 * 60 * 1000) - 1);
  }

  if (!from && !to && period === 'day') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(query.date || ''))) throw reportError('Select a valid report date.');
    from = parseDate(`${query.date}T00:00:00+05:00`, 'Report date');
    to = new Date(from.getTime() + (24 * 60 * 60 * 1000) - 1);
  }

  if (!from && !to && period === 'month') {
    if (!/^\d{4}-\d{2}$/.test(String(query.month || ''))) throw reportError('Select a valid report month.');
    const [year, month] = query.month.split('-').map(Number);
    from = parseDate(`${query.month}-01T00:00:00+05:00`, 'Report month');
    const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;
    to = new Date(parseDate(`${nextMonth}-01T00:00:00+05:00`, 'Report month').getTime() - 1);
  }

  if (period === 'custom' && (!from || !to)) {
    throw reportError('Select both a start and end date and time.');
  }
  if (from && to && from > to) throw reportError('Start date and time must be before the end date and time.');

  let label = 'All time';
  if (period === 'today') label = 'Today';
  if (period === 'day') label = `Day: ${query.date}`;
  if (period === 'month') label = `Month: ${query.month}`;
  if (period === 'custom') label = 'Custom date and time range';

  return { period, from, to, label };
}

function normalizeFilters(query = {}) {
  const range = resolveDateRange(query);
  const orderStatus = query.orderStatus && query.orderStatus !== 'All' ? query.orderStatus : 'All';
  const paymentStatus = query.paymentStatus && query.paymentStatus !== 'All' ? query.paymentStatus : 'All';
  if (orderStatus !== 'All' && !ORDER_STATUSES.includes(orderStatus)) throw reportError('Invalid order status filter.');
  if (paymentStatus !== 'All' && !PAYMENT_STATUSES.includes(paymentStatus)) throw reportError('Invalid payment status filter.');
  return { ...range, orderStatus, paymentStatus };
}

function orderWhere(filters, extra = {}) {
  const where = { ...extra };
  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) where.createdAt[Op.gte] = filters.from;
    if (filters.to) where.createdAt[Op.lte] = filters.to;
  }
  if (filters.orderStatus !== 'All') where.orderStatus = filters.orderStatus;
  if (filters.paymentStatus !== 'All') where.paymentStatus = filters.paymentStatus;
  return where;
}

function allowedReportTypesForRole(role) {
  return REPORT_TYPES_BY_ROLE[role] || [];
}

function validateReportType(role, requestedType) {
  const allowed = allowedReportTypesForRole(role);
  const reportType = requestedType || allowed[0];
  if (!allowed.includes(reportType)) {
    throw reportError(`The ${role} role can generate: ${allowed.join(', ') || 'no reports'}.`);
  }
  return reportType;
}

const unique = (values) => [...new Set(values.filter(Boolean))];
const itemText = (items) => items.map((item) => `${item.productName} (${item.quantity} ${item.unit})`).join(', ');
const itemQuantity = (items) => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
const itemValue = (items) => items.reduce((sum, item) => sum + number(item.lineTotal), 0);

async function userNameMap(ids) {
  const uniqueIds = unique(ids);
  if (!uniqueIds.length) return {};
  const users = await User.findAll({
    where: { id: { [Op.in]: uniqueIds } },
    attributes: ['id', 'name', 'companyName', 'role'],
  });
  return Object.fromEntries(users.map((user) => [user.id, {
    name: user.companyName || user.name || 'ConMat user',
    role: user.role,
  }]));
}

function summarizeReportRows(rows) {
  return {
    recordCount: rows.length,
    orderCount: unique(rows.map((row) => row.orderId)).length,
    totalQuantity: rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0),
    buyingAmount: rows.filter((row) => row.reportType === 'Buying').reduce((sum, row) => sum + number(row.amount), 0),
    sellingGross: rows.filter((row) => row.reportType === 'Selling').reduce((sum, row) => sum + number(row.amount), 0),
    platformOrderValue: rows.filter((row) => row.reportType === 'Platform').reduce((sum, row) => sum + number(row.amount), 0),
    paidAmount: rows.filter((row) => row.paymentStatus === 'Paid').reduce((sum, row) => sum + number(row.amount), 0),
    commissionAmount: rows.reduce((sum, row) => sum + number(row.commissionAmount), 0),
    sellerNetAmount: rows.reduce((sum, row) => sum + number(row.netAmount), 0),
    cancelledOrders: unique(rows.filter((row) => row.orderStatus === 'Cancelled').map((row) => row.orderId)).length,
  };
}

function serializeFilters(filters) {
  return {
    period: filters.period,
    label: filters.label,
    from: filters.from?.toISOString() || null,
    to: filters.to?.toISOString() || null,
    orderStatus: filters.orderStatus,
    paymentStatus: filters.paymentStatus,
  };
}

async function generateUserReport({ user, query = {} }) {
  const reportType = validateReportType(user.role, query.reportType);
  const filters = normalizeFilters(query);
  const includeBuying = ['buying', 'combined'].includes(reportType);
  const includeSelling = ['selling', 'combined'].includes(reportType);

  const buyingOrders = includeBuying
    ? await Order.findAll({ where: orderWhere(filters, { buyerId: user.id }), order: [['createdAt', 'DESC']] })
    : [];
  const sellerItems = includeSelling
    ? await OrderItem.findAll({ where: { sellerId: user.id }, order: [['createdAt', 'DESC']] })
    : [];
  const sellerOrderIds = unique(sellerItems.map((item) => item.orderId));
  const sellingOrders = sellerOrderIds.length
    ? await Order.findAll({ where: orderWhere(filters, { id: { [Op.in]: sellerOrderIds } }), order: [['createdAt', 'DESC']] })
    : [];
  const allOrders = [...buyingOrders, ...sellingOrders];
  const orderIds = unique(allOrders.map((order) => order.id));
  const allItems = orderIds.length
    ? await OrderItem.findAll({ where: { orderId: { [Op.in]: orderIds } }, order: [['createdAt', 'ASC']] })
    : [];
  const filteredSellerItems = sellerItems.filter((item) => orderIds.includes(item.orderId));
  const payouts = includeSelling && sellingOrders.length
    ? await SellerPayout.findAll({ where: { orderId: { [Op.in]: sellingOrders.map((order) => order.id) }, sellerId: user.id } })
    : [];
  const payoutMap = Object.fromEntries(payouts.map((payout) => [payout.orderId, payout]));
  const relevantItems = [...allItems, ...filteredSellerItems];
  const people = await userNameMap([
    ...allOrders.map((order) => order.buyerId),
    ...relevantItems.map((item) => item.sellerId),
  ]);

  const rows = [];
  for (const order of buyingOrders) {
    const items = allItems.filter((item) => item.orderId === order.id);
    const sellerNames = unique(items.map((item) => people[item.sellerId]?.name));
    rows.push({
      id: `buying-${order.id}`,
      reportType: 'Buying',
      orderId: order.id,
      orderNumber: order.orderNumber,
      occurredAt: order.createdAt,
      counterparty: sellerNames.length > 1 ? 'Multiple sellers' : sellerNames[0] || 'Seller',
      items: itemText(items),
      quantity: itemQuantity(items),
      pricingTypes: unique(items.map((item) => item.pricingType)).join(', '),
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      payoutStatus: null,
      amount: number(order.totalAmount),
      commissionAmount: 0,
      netAmount: 0,
    });
  }

  for (const order of sellingOrders) {
    const items = sellerItems.filter((item) => item.orderId === order.id);
    const payout = payoutMap[order.id];
    rows.push({
      id: `selling-${order.id}`,
      reportType: 'Selling',
      orderId: order.id,
      orderNumber: order.orderNumber,
      occurredAt: order.createdAt,
      counterparty: people[order.buyerId]?.name || order.buyerName || 'Buyer',
      items: itemText(items),
      quantity: itemQuantity(items),
      pricingTypes: unique(items.map((item) => item.pricingType)).join(', '),
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      payoutStatus: payout?.status || (order.paymentStatus === 'Paid' ? 'Held' : 'Not funded'),
      amount: itemValue(items),
      commissionAmount: number(payout?.commissionAmount),
      netAmount: number(payout?.netAmount),
    });
  }

  rows.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
  return {
    title: `${user.role} ${reportType === 'combined' ? 'Buying and Selling' : `${reportType[0].toUpperCase()}${reportType.slice(1)}`} Report`,
    scope: reportType,
    generatedAt: new Date().toISOString(),
    owner: { id: user.id, name: user.companyName || user.name, role: user.role },
    filters: serializeFilters(filters),
    summary: summarizeReportRows(rows),
    rows,
  };
}

async function generatePlatformReport({ user, query = {} }) {
  validateReportType(user.role, 'platform');
  const filters = normalizeFilters(query);
  const orders = await Order.findAll({ where: orderWhere(filters), order: [['createdAt', 'DESC']] });
  const orderIds = orders.map((order) => order.id);
  const [items, payouts] = orderIds.length ? await Promise.all([
    OrderItem.findAll({ where: { orderId: { [Op.in]: orderIds } }, order: [['createdAt', 'ASC']] }),
    SellerPayout.findAll({ where: { orderId: { [Op.in]: orderIds } } }),
  ]) : [[], []];
  const people = await userNameMap([
    ...orders.map((order) => order.buyerId),
    ...items.map((item) => item.sellerId),
  ]);

  const rows = orders.map((order) => {
    const orderItems = items.filter((item) => item.orderId === order.id);
    const orderPayouts = payouts.filter((payout) => payout.orderId === order.id);
    const sellers = unique(orderItems.map((item) => people[item.sellerId]?.name));
    const buyer = people[order.buyerId]?.name || order.buyerName || 'Buyer';
    return {
      id: `platform-${order.id}`,
      reportType: 'Platform',
      orderId: order.id,
      orderNumber: order.orderNumber,
      occurredAt: order.createdAt,
      counterparty: `Buyer: ${buyer} | Seller: ${sellers.length > 1 ? 'Multiple sellers' : sellers[0] || 'Seller'}`,
      items: itemText(orderItems),
      quantity: itemQuantity(orderItems),
      pricingTypes: unique(orderItems.map((item) => item.pricingType)).join(', '),
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      payoutStatus: unique(orderPayouts.map((payout) => payout.status)).join(', ') || 'Not funded',
      amount: number(order.totalAmount),
      commissionAmount: orderPayouts.reduce((sum, payout) => sum + number(payout.commissionAmount), 0),
      netAmount: orderPayouts.reduce((sum, payout) => sum + number(payout.netAmount), 0),
    };
  });

  return {
    title: 'ConMat Platform Transaction Report',
    scope: 'platform',
    generatedAt: new Date().toISOString(),
    owner: { id: user.id, name: user.name, role: user.role },
    filters: serializeFilters(filters),
    summary: summarizeReportRows(rows),
    rows,
  };
}

module.exports = {
  REPORT_TYPES_BY_ROLE,
  allowedReportTypesForRole,
  resolveDateRange,
  summarizeReportRows,
  generateUserReport,
  generatePlatformReport,
};
