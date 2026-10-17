const { SecurityLog, Product, Order, Bid, BidOffer } = require('../models');

const sellerRoles = new Set(['Supplier', 'Wholesaler', 'Retailer']);
const requesterRoles = new Set(['Customer', 'Retailer', 'Wholesaler']);
const bidderRoles = new Set(['Supplier', 'Wholesaler']);

const iso = (value) => value ? new Date(value).toISOString() : null;
const statusText = (value) => String(value || 'updated').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();

function accountActivity(log) {
  const row = log.toJSON();
  const descriptions = {
    'Account registered': 'Your ConMat account was created.',
    'Admin account created': 'Your administrator account was created.',
    Login: 'You signed in to your ConMat account.',
    'Profile updated': 'You updated your profile information.',
    'Business live location updated': 'You updated the live location shown on your business profile.',
    'Password changed': 'You changed your account password.',
  };
  const titles = {
    'Account registered': 'Account created',
    'Admin account created': 'Administrator account created',
    Login: 'Signed in',
    'Profile updated': 'Profile updated',
    'Business live location updated': 'Business location updated',
    'Password changed': 'Password changed',
  };

  return {
    id: `account-${row.id}`,
    type: 'Account',
    title: titles[row.action] || row.action || 'Account activity',
    description: descriptions[row.action] || 'Your account activity was recorded.',
    occurredAt: iso(row.createdAt),
    actionUrl: '/account/profile',
  };
}

function productActivity(product) {
  const row = product.toJSON();
  const createdAt = new Date(row.createdAt).getTime();
  const updatedAt = new Date(row.updatedAt).getTime();
  const wasUpdated = Number.isFinite(updatedAt) && Number.isFinite(createdAt) && updatedAt - createdAt > 1000;

  return {
    id: `product-${row.id}`,
    type: 'Product',
    title: wasUpdated ? 'Product listing updated' : 'Product listing created',
    description: `“${row.name}” is ${statusText(row.status)}.`,
    occurredAt: iso(wasUpdated ? row.updatedAt : row.createdAt),
    actionUrl: '/manage-products',
  };
}

function orderActivity(order) {
  const row = order.toJSON();
  const amount = Number(row.totalAmount || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 });
  return {
    id: `order-${row.id}`,
    type: 'Order',
    title: `Order ${statusText(row.orderStatus)}`,
    description: `${row.orderNumber} · PKR ${amount}`,
    occurredAt: iso(row.updatedAt || row.createdAt),
    actionUrl: `/orders/${row.id}/tracking`,
  };
}

function requestActivity(request) {
  const row = request.toJSON();
  return {
    id: `request-${row.id}`,
    type: 'Bid',
    title: `Bulk request ${statusText(row.requestStatus)}`,
    description: `${row.title} · ${row.requiredQuantity} ${row.unit}`,
    occurredAt: iso(row.updatedAt || row.createdAt),
    actionUrl: `/bids/compare/${row.id}`,
  };
}

function offerActivity(offer) {
  const row = offer.toJSON();
  const amount = Number(row.bidAmount || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 });
  return {
    id: `offer-${row.id}`,
    type: 'Bid',
    title: `Bid offer ${statusText(row.status)}`,
    description: `Your unit-price offer is PKR ${amount}.`,
    occurredAt: iso(row.updatedAt || row.createdAt),
    actionUrl: '/bids/opportunities',
  };
}

async function emptyResult() {
  return { rows: [], count: 0 };
}

async function listRecentActivities({ userId, role, limit = 5, offset = 0 }) {
  const fetchLimit = offset + limit;
  const [account, products, orders, requests, offers] = await Promise.all([
    SecurityLog.findAndCountAll({ where: { userId }, order: [['createdAt', 'DESC']], limit: fetchLimit }),
    sellerRoles.has(role)
      ? Product.findAndCountAll({ where: { sellerId: userId }, order: [['updatedAt', 'DESC']], limit: fetchLimit })
      : emptyResult(),
    Order.findAndCountAll({ where: { buyerId: userId }, order: [['updatedAt', 'DESC']], limit: fetchLimit }),
    requesterRoles.has(role)
      ? Bid.findAndCountAll({ where: { requestedById: userId }, order: [['updatedAt', 'DESC']], limit: fetchLimit })
      : emptyResult(),
    bidderRoles.has(role)
      ? BidOffer.findAndCountAll({ where: { supplierId: userId }, order: [['updatedAt', 'DESC']], limit: fetchLimit })
      : emptyResult(),
  ]);

  const activities = [
    ...account.rows.map(accountActivity),
    ...products.rows.map(productActivity),
    ...orders.rows.map(orderActivity),
    ...requests.rows.map(requestActivity),
    ...offers.rows.map(offerActivity),
  ].sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));

  const total = account.count + products.count + orders.count + requests.count + offers.count;
  const data = activities.slice(offset, offset + limit);
  const nextOffset = offset + data.length;

  return { data, total, limit, offset, nextOffset, hasMore: nextOffset < total };
}

module.exports = { listRecentActivities };
