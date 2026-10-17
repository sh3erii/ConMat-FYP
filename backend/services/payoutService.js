const { Op } = require('sequelize');
const { OrderItem, Payment, SellerPayout, User } = require('../models');
const { number } = require('./formatters');
const { notifySafely } = require('./notificationService');
const { runInBackground } = require('./asyncService');
const { defaultMethodsForSellers } = require('./payoutMethodService');

const COMMISSION_BASIS_POINTS = 100;
const COMMISSION_RATE = COMMISSION_BASIS_POINTS / 10000;
const SELLER_ROLES = new Set(['Supplier', 'Wholesaler', 'Retailer']);
const toMinorUnits = (value) => Math.max(0, Math.round(number(value) * 100));
const fromMinorUnits = (value) => Number((value / 100).toFixed(2));
const money = (value, currency = 'pkr') => `${String(currency || 'pkr').toUpperCase()} ${number(value).toLocaleString('en-PK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

function sellerItemSummary(items = [], currency = 'pkr') {
  return items.map((item) => (
    `${item.productName} - ${item.quantity} ${item.unit} x ${money(item.unitPrice, currency)} = ${money(item.lineTotal, currency)}`
  )).join('\n');
}

function sellerPaymentEmail({ order, payout, sellerItems = [], releaseReason, settlement, releasedAt }) {
  const automatic = releaseReason === 'automatic_24h';
  const demo = settlement.processor === 'ConMat Demo';
  const destination = payout.payoutDestination || payout.payoutProvider || 'Configured payout account';
  const releaseDescription = automatic
    ? 'Automatic release after the 24-hour buyer response window'
    : 'Buyer confirmed receipt';
  return {
    title: demo ? 'Payment received (demo)' : 'Payment received',
    message: demo
      ? `A demo payment of ${money(payout.netAmount, payout.currency)} for order ID ${order.orderNumber} was recorded for ${destination} after deducting ConMat's 1% commission.`
      : `Payment of ${money(payout.netAmount, payout.currency)} for order ID ${order.orderNumber} was sent to ${destination} after deducting ConMat's 1% commission.`,
    details: {
      'Payment status': demo ? 'Demo payment recorded' : 'Paid',
      'Order ID': order.orderNumber,
      Buyer: order.buyerName || 'ConMat buyer',
      'Your order items': sellerItemSummary(sellerItems, payout.currency) || 'Order item details unavailable',
      'Gross order amount': money(payout.grossAmount, payout.currency),
      'Commission rate': '1%',
      'ConMat commission deducted': money(payout.commissionAmount, payout.currency),
      'Net payment received': money(payout.netAmount, payout.currency),
      'Payment account': destination,
      'Release reason': releaseDescription,
      'Payment reference': settlement.reference,
      'Payment date': new Date(releasedAt).toLocaleString('en-PK'),
      ...(demo ? { 'Settlement mode': 'Demo - no live funds were transferred' } : {}),
    },
  };
}

function payoutProcessingMode() {
  const fallback = process.env.NODE_ENV === 'production' ? 'live' : 'demo';
  return String(process.env.PAYOUT_PROCESSING_MODE || fallback).trim().toLowerCase();
}

function calculateSellerPayoutAmounts(grossAmount) {
  const grossMinor = toMinorUnits(grossAmount);
  const commissionMinor = Math.round((grossMinor * COMMISSION_BASIS_POINTS) / 10000);
  const netMinor = grossMinor - commissionMinor;
  return {
    grossMinor,
    commissionMinor,
    netMinor,
    grossAmount: fromMinorUnits(grossMinor),
    commissionAmount: fromMinorUnits(commissionMinor),
    netAmount: fromMinorUnits(netMinor),
  };
}

function sellerGrossAmounts(items) {
  const totals = new Map();
  for (const item of items) {
    const snapshot = item.productSnapshot || {};
    const grossMinor = toMinorUnits(item.lineTotal) + toMinorUnits(snapshot.appliedDeliveryCharge);
    totals.set(item.sellerId, (totals.get(item.sellerId) || 0) + grossMinor);
  }
  return totals;
}

function deriveFundsStatus(sellerIds, payouts, hadFailure = false) {
  const sellerCount = new Set(sellerIds.map(String)).size;
  const transferredSellerCount = new Set(payouts
    .filter((payout) => payout.status === 'Transferred')
    .map((payout) => String(payout.sellerId))).size;
  return sellerCount > 0 && transferredSellerCount === sellerCount
    ? 'Released'
    : transferredSellerCount > 0
      ? 'PartiallyReleased'
      : hadFailure
        ? 'ReleaseFailed'
        : 'Held';
}

async function ensurePayoutLedger(order, payment, { sellerIds = null } = {}) {
  const items = await OrderItem.findAll({ where: { orderId: order.id } });
  if (!items.length) throw Object.assign(new Error('This order has no seller items to release.'), { status: 409 });

  const grossBySeller = sellerGrossAmounts(items);
  const payoutGrossMinor = [...grossBySeller.values()].reduce((sum, value) => sum + value, 0);
  if (payoutGrossMinor > toMinorUnits(payment.amount)) {
    throw Object.assign(new Error('Seller payout allocation exceeds the buyer payment amount.'), { status: 409 });
  }

  const requestedSellerIds = Array.isArray(sellerIds) ? new Set(sellerIds.map(String)) : null;
  const payoutSellerIds = [...grossBySeller.keys()].filter((sellerId) => (
    !requestedSellerIds || requestedSellerIds.has(String(sellerId))
  ));
  if (!payoutSellerIds.length) {
    throw Object.assign(new Error('No matching seller payout was found for this delivery.'), { status: 404 });
  }
  const [sellers, methods] = await Promise.all([
    User.findAll({
      where: { id: { [Op.in]: payoutSellerIds } },
      attributes: ['id', 'name', 'companyName', 'email', 'role'],
    }),
    defaultMethodsForSellers(payoutSellerIds),
  ]);
  const sellerMap = new Map(sellers.map((seller) => [seller.id, seller]));
  const missing = payoutSellerIds.filter((sellerId) => {
    const seller = sellerMap.get(sellerId);
    return !seller || !SELLER_ROLES.has(seller.role) || !methods.has(sellerId);
  });
  if (missing.length) {
    throw Object.assign(new Error('One or more sellers have not configured a supported payout method.'), { status: 409 });
  }

  const payouts = [];
  for (const [sellerId, grossMinor] of grossBySeller.entries()) {
    if (requestedSellerIds && !requestedSellerIds.has(String(sellerId))) continue;
    const seller = sellerMap.get(sellerId);
    const method = methods.get(sellerId);
    const amounts = calculateSellerPayoutAmounts(fromMinorUnits(grossMinor));
    const values = {
      paymentId: payment.id,
      payoutMethodId: method.id,
      payoutProvider: method.provider,
      payoutDestination: `${method.provider} ending in ${method.accountIdentifierLast4}`,
      currency: String(payment.currency || 'pkr').toLowerCase(),
      grossAmount: amounts.grossAmount,
      commissionRate: COMMISSION_RATE,
      commissionAmount: amounts.commissionAmount,
      netAmount: amounts.netAmount,
    };
    const [payout, created] = await SellerPayout.findOrCreate({
      where: { orderId: order.id, sellerId },
      defaults: { orderId: order.id, sellerId, ...values, status: 'Pending' },
    });
    if (!created && ['Pending', 'Failed'].includes(payout.status)) await payout.update(values);
    payouts.push({
      payout,
      seller,
      method,
      sellerItems: items.filter((item) => item.sellerId === sellerId),
    });
  }
  return payouts;
}

async function executePayout({ payout }) {
  const mode = payoutProcessingMode();
  if (mode === 'demo') {
    return {
      processor: 'ConMat Demo',
      reference: `demo_${String(payout.id).replaceAll('-', '')}`,
    };
  }

  throw Object.assign(new Error(
    `${payout.payoutProvider} live disbursement is not configured. Set PAYOUT_PROCESSING_MODE=demo only for test-card demonstrations, or install a verified provider API adapter before going live.`
  ), { status: 503 });
}

async function releaseSinglePayout({ order, payout, seller, sellerItems, releaseReason }) {
  if (payout.status === 'Transferred' && (payout.processorReference || payout.stripeTransferId)) return payout;

  const [claimed] = await SellerPayout.update({
    status: 'Processing',
    failureMessage: null,
    releaseAttemptedAt: new Date(),
    releaseReason,
  }, {
    where: { id: payout.id, status: { [Op.in]: ['Pending', 'Failed'] } },
  });
  if (!claimed) {
    await payout.reload();
    if (payout.status === 'Transferred') return payout;
    throw Object.assign(new Error('This seller payout is already being processed.'), { status: 409 });
  }

  try {
    const settlement = await executePayout({ payout });
    const releasedAt = new Date();
    await payout.update({
      processor: settlement.processor,
      processorReference: settlement.reference,
      status: 'Transferred',
      failureMessage: null,
      releasedAt,
      releaseReason,
    });
    const automatic = releaseReason === 'automatic_24h';
    const email = sellerPaymentEmail({ order, payout, sellerItems, releaseReason, settlement, releasedAt });
    runInBackground(`Seller payout notification skipped for ${payout.id}`, async () => {
      await notifySafely({
        userId: seller.id,
        email: seller.email,
        title: email.title,
        message: email.message,
        type: 'Payment',
        actionUrl: '/supplier/incoming-orders',
        metadata: {
          event: automatic ? 'seller-payout-auto-released' : 'seller-payout-released',
          orderId: order.id,
          payoutId: payout.id,
          processorReference: settlement.reference,
          provider: payout.payoutProvider,
        },
        emailDetails: email.details,
      }, 'Seller payout notification skipped');
    });
    return payout;
  } catch (error) {
    await payout.update({ status: 'Failed', failureMessage: String(error.message || 'Payout transfer failed').slice(0, 1000) });
    throw error;
  }
}

async function releaseOrderPayouts(order, { releaseReason = 'buyer_confirmation', sellerIds = null } = {}) {
  const payment = await Payment.findOne({ where: { orderId: order.id } });
  if (!payment || payment.status !== 'Paid') {
    throw Object.assign(new Error('The buyer payment must be completed before seller funds can be released.'), { status: 409 });
  }

  const requestedSellerIds = Array.isArray(sellerIds) ? new Set(sellerIds.map(String)) : null;
  const payoutEntries = (await ensurePayoutLedger(order, payment, { sellerIds })).filter(({ payout }) => (
    !requestedSellerIds || requestedSellerIds.has(String(payout.sellerId))
  ));
  if (!payoutEntries.length) {
    throw Object.assign(new Error('No matching seller payout was found for this delivery.'), { status: 404 });
  }
  const results = await Promise.allSettled(payoutEntries.map(async ({ payout, seller, sellerItems }) => (
    await releaseSinglePayout({ order, payout, seller, sellerItems, releaseReason })
  )));
  const failed = results.filter((result) => result.status === 'rejected');
  const [currentPayouts, orderItems] = await Promise.all([
    SellerPayout.findAll({ where: { orderId: order.id }, order: [['createdAt', 'ASC']] }),
    OrderItem.findAll({ where: { orderId: order.id }, attributes: ['sellerId'] }),
  ]);
  const fundsStatus = deriveFundsStatus(
    orderItems.map((item) => item.sellerId),
    currentPayouts,
    failed.length > 0
  );
  await payment.update({ fundsStatus });

  if (failed.length) {
    const firstReason = failed[0].reason?.message;
    throw Object.assign(new Error(firstReason || `${failed.length} seller payout${failed.length === 1 ? '' : 's'} could not be released.`), { status: 502 });
  }
  return requestedSellerIds
    ? currentPayouts.filter((payout) => requestedSellerIds.has(String(payout.sellerId)))
    : currentPayouts;
}

module.exports = {
  COMMISSION_BASIS_POINTS,
  COMMISSION_RATE,
  payoutProcessingMode,
  calculateSellerPayoutAmounts,
  deriveFundsStatus,
  sellerPaymentEmail,
  ensurePayoutLedger,
  releaseOrderPayouts,
};
