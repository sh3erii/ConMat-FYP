const Order = require('../models/Order');
const OrderAdminStatusLog = require('../models/OrderAdminStatusLog');
const { Op } = require('sequelize');

const ORDER_STATUSES = ['Confirmed', 'Processing', 'Packed', 'Dispatched', 'Delivered', 'Payment Issue', 'Cancelled'];

function assertStatus(status) {
  if (!ORDER_STATUSES.includes(status)) {
    throw new Error(`Invalid order status. Allowed: ${ORDER_STATUSES.join(', ')}`);
  }
}

function buildOrderWhere(query = {}) {
  const where = {};

  if (query.orderStatus && query.orderStatus !== 'All') where.orderStatus = query.orderStatus;
  if (query.paymentStatus && query.paymentStatus !== 'All') where.paymentStatus = query.paymentStatus;
  if (query.city && query.city !== 'All') where.city = query.city;

  if (query.search) {
    where[Op.or] = [
      { orderNumber: { [Op.iLike]: `%${query.search}%` } },
      { buyerName: { [Op.iLike]: `%${query.search}%` } },
      { sellerName: { [Op.iLike]: `%${query.search}%` } },
      { city: { [Op.iLike]: `%${query.search}%` } },
    ];
  }

  return where;
}

async function listAdminOrders(query = {}) {
  const limit = Number(query.limit || 50);
  const page = Number(query.page || 1);
  const offset = (page - 1) * limit;

  const result = await Order.findAndCountAll({
    where: buildOrderWhere(query),
    limit,
    offset,
    order: [['createdAt', 'DESC']],
  });

  return {
    orders: result.rows,
    total: result.count,
    page,
    totalPages: Math.ceil(result.count / limit),
  };
}

async function updateOrderStatus(orderId, payload = {}) {
  assertStatus(payload.orderStatus);

  const order = await Order.findByPk(orderId);
  if (!order) throw new Error('Order not found.');

  const previousStatus = order.orderStatus || order.status || 'Confirmed';

  await order.update({
    orderStatus: payload.orderStatus,
    status: payload.orderStatus,
    adminNote: payload.note || null,
  });

  await OrderAdminStatusLog.create({
    orderId: order.id,
    orderNumber: order.orderNumber,
    previousStatus,
    newStatus: payload.orderStatus,
    paymentStatus: order.paymentStatus || null,
    adminId: payload.adminId || null,
    note: payload.note || `Order marked as ${payload.orderStatus}.`,
  });

  return order;
}

async function getOrderAdminTimeline(orderId) {
  const order = await Order.findByPk(orderId);
  if (!order) throw new Error('Order not found.');

  const logs = await OrderAdminStatusLog.findAll({
    where: { orderId },
    order: [['createdAt', 'ASC']],
  });

  return { order, timeline: logs };
}

module.exports = {
  ORDER_STATUSES,
  listAdminOrders,
  updateOrderStatus,
  getOrderAdminTimeline,
};
