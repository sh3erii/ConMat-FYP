const assert = require('assert');
const models = require('../models');
const { generatePlatformReport, generateUserReport } = require('../services/reportService');

const orders = [
  { id: 'order-buy', orderNumber: 'CM-BUY', buyerId: 'wholesaler-1', buyerName: 'Wholesale Buyer', createdAt: new Date('2026-09-01T08:00:00.000Z'), orderStatus: 'Delivered', paymentStatus: 'Paid', totalAmount: 450 },
  { id: 'order-wholesale-sale', orderNumber: 'CM-WSALE', buyerId: 'customer-1', buyerName: 'Customer One', createdAt: new Date('2026-09-02T08:00:00.000Z'), orderStatus: 'Delivered', paymentStatus: 'Paid', totalAmount: 700 },
  { id: 'order-retail-sale', orderNumber: 'CM-RSALE', buyerId: 'customer-1', buyerName: 'Customer One', createdAt: new Date('2026-09-03T08:00:00.000Z'), orderStatus: 'Confirmed', paymentStatus: 'Pending', totalAmount: 350 },
];

const items = [
  { orderId: 'order-buy', sellerId: 'supplier-1', productName: 'Cement', quantity: 4, unit: 'bag', pricingType: 'wholesale', lineTotal: 400 },
  { orderId: 'order-wholesale-sale', sellerId: 'wholesaler-1', productName: 'Steel', quantity: 3, unit: 'piece', pricingType: 'retail', lineTotal: 600 },
  { orderId: 'order-retail-sale', sellerId: 'retailer-1', productName: 'Paint', quantity: 2, unit: 'bucket', pricingType: 'retail', lineTotal: 300 },
];

const payouts = [
  { orderId: 'order-buy', sellerId: 'supplier-1', status: 'Transferred', commissionAmount: 10, netAmount: 390 },
  { orderId: 'order-wholesale-sale', sellerId: 'wholesaler-1', status: 'Transferred', commissionAmount: 15, netAmount: 585 },
];

const people = [
  { id: 'customer-1', name: 'Customer One', companyName: null, role: 'Customer' },
  { id: 'wholesaler-1', name: 'Wholesale Owner', companyName: 'Wholesale Co', role: 'Wholesaler' },
  { id: 'supplier-1', name: 'Supplier Owner', companyName: 'Supply Co', role: 'Supplier' },
  { id: 'retailer-1', name: 'Retail Owner', companyName: 'Retail Co', role: 'Retailer' },
];

const valuesFromIn = (condition) => {
  if (!condition || typeof condition !== 'object') return [];
  const symbol = Object.getOwnPropertySymbols(condition)[0];
  return symbol ? condition[symbol] : [];
};

models.Order.findAll = async ({ where = {} }) => {
  if (where.buyerId) return orders.filter((order) => order.buyerId === where.buyerId);
  if (where.id) {
    const ids = valuesFromIn(where.id);
    return orders.filter((order) => ids.includes(order.id));
  }
  return orders;
};

models.OrderItem.findAll = async ({ where = {} }) => {
  if (where.sellerId) return items.filter((item) => item.sellerId === where.sellerId);
  if (where.orderId) {
    const ids = valuesFromIn(where.orderId);
    return items.filter((item) => ids.includes(item.orderId));
  }
  return items;
};

models.SellerPayout.findAll = async ({ where = {} }) => payouts.filter((payout) => {
  const ids = valuesFromIn(where.orderId);
  return (!ids.length || ids.includes(payout.orderId)) && (!where.sellerId || where.sellerId === payout.sellerId);
});

models.User.findAll = async () => people;

(async () => {
  const customer = await generateUserReport({ user: { id: 'customer-1', name: 'Customer One', role: 'Customer' }, query: { reportType: 'buying' } });
  assert.strictEqual(customer.scope, 'buying');
  assert.strictEqual(customer.summary.orderCount, 2);
  assert.strictEqual(customer.summary.buyingAmount, 1050);

  const retailer = await generateUserReport({ user: { id: 'retailer-1', name: 'Retail Owner', role: 'Retailer' }, query: { reportType: 'selling' } });
  assert.strictEqual(retailer.summary.sellingGross, 300);
  assert.strictEqual(retailer.rows[0].counterparty, 'Customer One');

  const supplier = await generateUserReport({ user: { id: 'supplier-1', name: 'Supplier Owner', role: 'Supplier' }, query: { reportType: 'selling' } });
  assert.strictEqual(supplier.summary.sellingGross, 400);
  assert.strictEqual(supplier.summary.sellerNetAmount, 390);

  const wholesaler = await generateUserReport({ user: { id: 'wholesaler-1', name: 'Wholesale Owner', role: 'Wholesaler' }, query: { reportType: 'combined' } });
  assert.strictEqual(wholesaler.rows.length, 2);
  assert.strictEqual(wholesaler.summary.buyingAmount, 450);
  assert.strictEqual(wholesaler.summary.sellingGross, 600);
  assert.strictEqual(wholesaler.summary.commissionAmount, 15);

  const admin = await generatePlatformReport({ user: { id: 'admin-1', name: 'Admin', role: 'Admin' }, query: {} });
  assert.strictEqual(admin.rows.length, 3);
  assert.strictEqual(admin.summary.platformOrderValue, 1500);
  assert.strictEqual(admin.summary.commissionAmount, 25);

  await assert.rejects(
    generateUserReport({ user: { id: 'customer-1', role: 'Customer' }, query: { reportType: 'selling' } }),
    /Customer role can generate: buying/
  );

  console.log('Report flow check passed: customer buying, retailer and supplier selling, wholesaler combined, admin platform, and role restrictions.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
