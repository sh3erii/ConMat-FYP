const OrderTrackingEvent = require('../models/OrderTrackingEvent');

const STATUS_TITLES = {
  PLACED: 'Order Placed',
  PAID: 'Payment Confirmed',
  PACKED: 'Packed by Supplier',
  DISPATCHED: 'Order Dispatched',
  DELIVERED: 'Order Delivered',
  CANCELLED: 'Order Cancelled',
  RETURNED: 'Order Returned',
};

async function createTrackingEvent({ orderId, orderNumber, status, description, location, updatedBy, visibleToBuyer = true }) {
  if (!orderId || !status) {
    throw new Error('orderId and status are required for tracking event.');
  }

  const title = STATUS_TITLES[status] || status;

  return OrderTrackingEvent.create({
    orderId,
    orderNumber,
    status,
    title,
    description,
    location,
    updatedBy,
    visibleToBuyer,
  });
}

async function getOrderTracking(orderIdOrNumber, includePrivate = false) {
  const where = Number.isNaN(Number(orderIdOrNumber))
    ? { orderNumber: orderIdOrNumber }
    : { orderId: Number(orderIdOrNumber) };

  if (!includePrivate) {
    where.visibleToBuyer = true;
  }

  return OrderTrackingEvent.findAll({
    where,
    order: [['createdAt', 'ASC']],
  });
}

async function seedDefaultTracking(order) {
  const existing = await OrderTrackingEvent.count({ where: { orderId: order.id } });
  if (existing) return [];

  return Promise.all([
    createTrackingEvent({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: 'PLACED',
      description: 'Order has been placed successfully.',
      updatedBy: order.buyerId,
    }),
  ]);
}

module.exports = {
  createTrackingEvent,
  getOrderTracking,
  seedDefaultTracking,
};
