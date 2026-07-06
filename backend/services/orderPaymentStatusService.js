const OrderPaymentStatusLog = require('../models/OrderPaymentStatusLog');

const VALID_PAYMENT_STATUSES = ['Unpaid', 'Pending', 'Paid', 'Failed', 'Refunded', 'Partially Refunded'];

function assertValidStatus(status) {
  if (!VALID_PAYMENT_STATUSES.includes(status)) {
    throw new Error(`Invalid payment status. Allowed: ${VALID_PAYMENT_STATUSES.join(', ')}`);
  }
}

async function createPaymentStatusLog(payload) {
  assertValidStatus(payload.newStatus);

  if (!payload.orderNumber) {
    throw new Error('orderNumber is required.');
  }

  const log = await OrderPaymentStatusLog.create({
    orderId: payload.orderId || null,
    orderNumber: payload.orderNumber,
    previousStatus: payload.previousStatus || null,
    newStatus: payload.newStatus,
    paymentReference: payload.paymentReference || null,
    amount: payload.amount || null,
    changedBy: payload.changedBy || null,
    note: payload.note || null,
  });

  return log;
}

async function listPaymentStatusLogs(orderNumber) {
  if (!orderNumber) {
    throw new Error('orderNumber is required.');
  }

  return OrderPaymentStatusLog.findAll({
    where: { orderNumber },
    order: [['createdAt', 'ASC']],
  });
}

async function markOrderPaid(payload) {
  return createPaymentStatusLog({
    orderId: payload.orderId,
    orderNumber: payload.orderNumber,
    previousStatus: payload.previousStatus || 'Pending',
    newStatus: 'Paid',
    paymentReference: payload.paymentReference,
    amount: payload.amount,
    changedBy: payload.changedBy,
    note: payload.note || 'Payment confirmed by payment module.',
  });
}

async function markOrderPaymentFailed(payload) {
  return createPaymentStatusLog({
    orderId: payload.orderId,
    orderNumber: payload.orderNumber,
    previousStatus: payload.previousStatus || 'Pending',
    newStatus: 'Failed',
    paymentReference: payload.paymentReference,
    amount: payload.amount,
    changedBy: payload.changedBy,
    note: payload.note || 'Payment failed or cancelled.',
  });
}

module.exports = {
  VALID_PAYMENT_STATUSES,
  createPaymentStatusLog,
  listPaymentStatusLogs,
  markOrderPaid,
  markOrderPaymentFailed,
};
