const { Op } = require('sequelize');
const { Order, OrderItem, OrderStatusEvent, User } = require('../models');
const { releaseOrderPayouts } = require('./payoutService');
const { syncOrderStatusFromItems } = require('./orderService');
const { notifySafely } = require('./notificationService');
const { runInBackground } = require('./asyncService');

const RESPONSE_STATUSES = ['Delivery Confirmed', 'Delivery Auto Confirmed', 'Issue Reported'];

function deliveryResponseHours() {
  const configured = Number(process.env.PAYOUT_AUTO_RELEASE_HOURS || 24);
  return Number.isFinite(configured) && configured > 0 ? configured : 24;
}

function deliveryDeadlineFrom(deliveredAt) {
  return new Date(new Date(deliveredAt).getTime() + (deliveryResponseHours() * 60 * 60 * 1000));
}

async function ensureItemDeliveryResponseWindow(item) {
  if (!item || item.fulfillmentStatus !== 'Delivered' || item.deliveryResolution) return item;

  const priorResponse = await OrderStatusEvent.findOne({
    where: { orderId: item.orderId, orderItemId: item.id, status: { [Op.in]: RESPONSE_STATUSES } },
    order: [['createdAt', 'DESC']],
  });
  const deliveredEvent = await OrderStatusEvent.findOne({
    where: { orderId: item.orderId, orderItemId: item.id, status: 'Delivered' },
    order: [['createdAt', 'DESC']],
  });
  const deliveredAt = item.deliveredAt || deliveredEvent?.createdAt || item.updatedAt || item.createdAt;
  const inferredResolution = priorResponse?.status === 'Issue Reported'
    ? 'IssueReported'
    : priorResponse?.status === 'Delivery Auto Confirmed'
      ? 'AutoConfirmed'
      : priorResponse?.status === 'Delivery Confirmed'
        ? 'BuyerConfirmed'
        : 'AwaitingBuyer';
  await OrderItem.update({
    deliveredAt,
    deliveryResponseDeadline: item.deliveryResponseDeadline || deliveryDeadlineFrom(deliveredAt),
    deliveryResolution: inferredResolution,
  }, { where: { id: item.id, deliveryResolution: null } });
  await item.reload();
  return item;
}

async function ensureDeliveryResponseWindow(order) {
  if (!order) return order;
  const items = await OrderItem.findAll({ where: { orderId: order.id, fulfillmentStatus: 'Delivered' } });
  for (const item of items) await ensureItemDeliveryResponseWindow(item);
  await syncOrderStatusFromItems(order);
  await order.reload();
  return order;
}

async function sellerReadyForPayout(orderId, sellerId) {
  const items = await OrderItem.findAll({ where: { orderId, sellerId } });
  return items.length > 0 && items.every((item) => (
    item.fulfillmentStatus === 'Delivered'
    && ['BuyerConfirmed', 'AutoConfirmed'].includes(item.deliveryResolution)
  ));
}

async function releaseSellerIfReady(order, sellerId, releaseReason) {
  if (!await sellerReadyForPayout(order.id, sellerId)) {
    return { released: false, pending: true, payouts: [] };
  }
  const payouts = await releaseOrderPayouts(order, { releaseReason, sellerIds: [sellerId] });
  return { released: true, pending: false, payouts };
}

async function autoReleaseItem(item, now = new Date()) {
  const [claimed] = await OrderItem.update({ deliveryResolution: 'ReleaseProcessing' }, {
    where: {
      id: item.id,
      fulfillmentStatus: 'Delivered',
      deliveryResolution: 'AwaitingBuyer',
      deliveryResponseDeadline: { [Op.lte]: now },
    },
  });
  if (!claimed) return { orderId: item.orderId, itemId: item.id, status: 'skipped' };

  const order = await Order.findByPk(item.orderId);
  if (!order || order.paymentStatus !== 'Paid') {
    await OrderItem.update({ deliveryResolution: 'AwaitingBuyer' }, {
      where: { id: item.id, deliveryResolution: 'ReleaseProcessing' },
    });
    return { orderId: item.orderId, itemId: item.id, status: 'skipped' };
  }

  const confirmedAt = new Date();
  await OrderItem.update({ deliveryResolution: 'AutoConfirmed' }, {
    where: { id: item.id, deliveryResolution: 'ReleaseProcessing' },
  });
  await OrderStatusEvent.create({
    orderId: order.id,
    orderItemId: item.id,
    sellerId: item.sellerId,
    status: 'Delivery Auto Confirmed',
    description: `${item.productName} was confirmed automatically after the ${deliveryResponseHours()}-hour response window elapsed without a confirmation or WhatsApp support pause.`,
    updatedBy: null,
    visibleToBuyer: true,
  });
  await syncOrderStatusFromItems(order);

  let release = { released: false, pending: true, payouts: [] };
  let payoutError = null;
  try {
    release = await releaseSellerIfReady(order, item.sellerId, 'automatic_24h');
  } catch (error) {
    payoutError = error;
    console.warn(`Automatic payout release failed for ${order.orderNumber}, item ${item.id}: ${error.message}`);
  }

  const buyer = await User.findByPk(order.buyerId, { attributes: ['id', 'email'] });
  await notifySafely({
    userId: order.buyerId,
    email: buyer?.email,
    title: 'Product delivery automatically confirmed',
    message: `${item.productName} in order ${order.orderNumber} was automatically confirmed because no WhatsApp support pause was recorded within ${deliveryResponseHours()} hours.`,
    type: 'Order',
    actionUrl: `/orders/${order.id}`,
    metadata: {
      event: 'item-delivery-auto-confirmed',
      orderId: order.id,
      orderItemId: item.id,
      sellerId: item.sellerId,
      payoutReleased: release.released,
    },
    emailDetails: {
      'Order ID': order.orderNumber,
      Product: item.productName,
      'Delivered at': new Date(item.deliveredAt || confirmedAt).toLocaleString('en-PK'),
      'Response deadline': new Date(item.deliveryResponseDeadline || confirmedAt).toLocaleString('en-PK'),
      Result: 'Product delivery automatically confirmed',
    },
  }, 'Buyer automatic release notification skipped');

  return {
    orderId: order.id,
    itemId: item.id,
    status: payoutError ? 'confirmed-payout-failed' : release.released ? 'released' : 'confirmed-payout-pending',
    error: payoutError?.message,
  };
}

async function autoReleaseOrder(order, now = new Date()) {
  await ensureDeliveryResponseWindow(order);
  const dueItems = await OrderItem.findAll({
    where: {
      orderId: order.id,
      fulfillmentStatus: 'Delivered',
      deliveryResolution: 'AwaitingBuyer',
      deliveryResponseDeadline: { [Op.lte]: now },
    },
  });
  const results = [];
  for (const item of dueItems) results.push(await autoReleaseItem(item, now));
  return { orderId: order.id, status: results.length ? 'processed' : 'skipped', items: results };
}

async function runAutoReleaseCycle({ now = new Date(), limit = 100 } = {}) {
  const deliveredWithoutWindow = await OrderItem.findAll({
    where: { fulfillmentStatus: 'Delivered', deliveryResolution: null },
    order: [['updatedAt', 'ASC']],
    limit,
  });
  for (const item of deliveredWithoutWindow) await ensureItemDeliveryResponseWindow(item);

  const dueItems = await OrderItem.findAll({
    where: {
      fulfillmentStatus: 'Delivered',
      deliveryResolution: 'AwaitingBuyer',
      deliveryResponseDeadline: { [Op.lte]: now },
    },
    order: [['deliveryResponseDeadline', 'ASC']],
    limit,
  });
  const results = [];
  for (const item of dueItems) results.push(await autoReleaseItem(item, now));
  return results;
}

function startAutoReleaseWorker() {
  const configured = Number(process.env.PAYOUT_AUTO_RELEASE_INTERVAL_MS || 60000);
  const intervalMs = Number.isFinite(configured) && configured >= 10000 ? configured : 60000;
  runInBackground('Initial automatic payout release cycle failed', async () => await runAutoReleaseCycle());
  const timer = setInterval(() => {
    runInBackground('Automatic payout release cycle failed', async () => await runAutoReleaseCycle());
  }, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
  return timer;
}

module.exports = {
  deliveryResponseHours,
  deliveryDeadlineFrom,
  ensureItemDeliveryResponseWindow,
  ensureDeliveryResponseWindow,
  sellerReadyForPayout,
  releaseSellerIfReady,
  autoReleaseItem,
  autoReleaseOrder,
  runAutoReleaseCycle,
  startAutoReleaseWorker,
};
