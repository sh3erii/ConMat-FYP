require('dotenv').config();

const assert = require('assert');
const {
  PROVIDERS,
  normalizeAccountIdentifier,
  encryptAccountIdentifier,
  decryptAccountIdentifier,
} = require('../services/payoutMethodService');
const { calculateSellerPayoutAmounts, sellerPaymentEmail } = require('../services/payoutService');
const { deliveryDeadlineFrom } = require('../services/autoReleaseService');
const { FULFILLMENT_SEQUENCE, estimateDeliveryWindow, nextFulfillmentStatus, productWholesaleDiscount } = require('../services/orderService');
const { detailedEmailContent } = require('../services/notificationService');
const { bidProductIssue } = require('../services/bidInventoryService');
const { resolveProductPricing } = require('../services/productPricingService');
const { allowedReportTypesForRole, resolveDateRange, summarizeReportRows } = require('../services/reportService');

assert.deepStrictEqual(Object.keys(PROVIDERS), ['JazzCash', 'Easypaisa', 'NayaPay', 'UBL', 'Meezan Bank']);

const validDestinations = [
  ['JazzCash', '03001234567', '+923001234567'],
  ['Easypaisa', '+923001234567', '+923001234567'],
  ['NayaPay', '923001234567', '+923001234567'],
  ['UBL', 'PK36SCBL0000001123456702', 'PK36SCBL0000001123456702'],
  ['Meezan Bank', '1234-5678-9012', '123456789012'],
];

for (const [provider, input, expected] of validDestinations) {
  const normalized = normalizeAccountIdentifier(provider, input);
  assert.strictEqual(normalized, expected);
  const encrypted = encryptAccountIdentifier(normalized);
  assert(!encrypted.includes(normalized), `${provider} destination must not be stored as plaintext.`);
  assert.strictEqual(decryptAccountIdentifier(encrypted), normalized);
}

assert.throws(() => normalizeAccountIdentifier('JazzCash', '12345'), /valid Pakistani mobile number/);
assert.throws(() => normalizeAccountIdentifier('UBL', 'not-an-account'), /valid Pakistan IBAN/);

assert.deepStrictEqual(calculateSellerPayoutAmounts(1000), {
  grossMinor: 100000,
  commissionMinor: 1000,
  netMinor: 99000,
  grossAmount: 1000,
  commissionAmount: 10,
  netAmount: 990,
});

const deliveredAt = new Date('2026-09-03T00:00:00.000Z');
assert.strictEqual(deliveryDeadlineFrom(deliveredAt).toISOString(), '2026-09-04T00:00:00.000Z');

assert.deepStrictEqual(FULFILLMENT_SEQUENCE, ['Confirmed', 'Processing', 'Packed', 'Dispatched', 'Delivered']);
assert.strictEqual(nextFulfillmentStatus('Confirmed'), 'Processing');
assert.strictEqual(nextFulfillmentStatus('Processing'), 'Packed');
assert.strictEqual(nextFulfillmentStatus('Packed'), 'Dispatched');
assert.strictEqual(nextFulfillmentStatus('Dispatched'), 'Delivered');
assert.strictEqual(nextFulfillmentStatus('Delivered'), null);
assert.strictEqual(estimateDeliveryWindow('Lahore', ['lahore']), '3–6 hours');
assert.strictEqual(estimateDeliveryWindow(' Lahore ', ['LAHORE', 'lahore ']), '3–6 hours');
assert.strictEqual(estimateDeliveryWindow('Lahore', ['Karachi']), '2–3 days');
assert.strictEqual(estimateDeliveryWindow('Lahore', ['Lahore', 'Karachi']), '2–3 days');
assert.strictEqual(estimateDeliveryWindow('Lahore', []), '2–3 days');

const wholesalerProduct = { retailPrice: 120, wholesalePrice: 95, minWholesaleQty: 50 };
assert.deepStrictEqual(resolveProductPricing(wholesalerProduct, 'Wholesaler', 49), {
  pricingModel: 'tiered',
  pricingType: 'retail',
  quantity: 49,
  unitPrice: 120,
  minimumQuantity: 50,
  meetsMinimum: true,
});
assert.deepStrictEqual(resolveProductPricing(wholesalerProduct, 'Wholesaler', 50), {
  pricingModel: 'tiered',
  pricingType: 'wholesale',
  quantity: 50,
  unitPrice: 95,
  minimumQuantity: 50,
  meetsMinimum: true,
});
assert.strictEqual(productWholesaleDiscount(wholesalerProduct, 'Wholesaler', 'wholesale', 95, 50), 1250);
assert.strictEqual(productWholesaleDiscount(wholesalerProduct, 'Wholesaler', 'retail', 120, 49), 0);
assert.strictEqual(productWholesaleDiscount(wholesalerProduct, 'Supplier', 'wholesale', 95, 50), 0);

assert.deepStrictEqual(allowedReportTypesForRole('Customer'), ['buying']);
assert.deepStrictEqual(allowedReportTypesForRole('Retailer'), ['selling']);
assert.deepStrictEqual(allowedReportTypesForRole('Supplier'), ['selling']);
assert.deepStrictEqual(allowedReportTypesForRole('Wholesaler'), ['buying', 'selling', 'combined']);
assert.deepStrictEqual(allowedReportTypesForRole('Admin'), ['platform']);
const dayRange = resolveDateRange({ period: 'day', date: '2026-09-05' });
assert.strictEqual(dayRange.from.toISOString(), '2026-09-04T19:00:00.000Z');
assert.strictEqual(dayRange.to.toISOString(), '2026-09-05T18:59:59.999Z');
const reportSummary = summarizeReportRows([
  { orderId: 'order-1', reportType: 'Buying', quantity: 2, amount: 500, paymentStatus: 'Paid', orderStatus: 'Delivered' },
  { orderId: 'order-2', reportType: 'Selling', quantity: 3, amount: 700, paymentStatus: 'Paid', orderStatus: 'Delivered', commissionAmount: 17.5, netAmount: 682.5 },
]);
assert.strictEqual(reportSummary.buyingAmount, 500);
assert.strictEqual(reportSummary.sellingGross, 700);
assert.strictEqual(reportSummary.commissionAmount, 17.5);
assert.strictEqual(reportSummary.sellerNetAmount, 682.5);

const bidRequest = { category: 'Cement', unit: 'bag', requiredQuantity: 536 };
const bidProduct = { sellerId: 'seller-1', name: 'Premium Cement', category: 'Cement', unit: 'bag', stock: 800, status: 'Active' };
assert.strictEqual(bidProductIssue(bidProduct, { sellerId: 'seller-1', request: bidRequest }), '');
assert.match(
  bidProductIssue({ ...bidProduct, stock: 500 }, { sellerId: 'seller-1', request: bidRequest }),
  /only 500 bag available; 536 are required/,
);
assert.match(
  bidProductIssue({ ...bidProduct, category: 'Steel' }, { sellerId: 'seller-1', request: bidRequest }),
  /does not match the requested Cement category/,
);
assert.match(
  bidProductIssue(bidProduct, { sellerId: 'seller-2', request: bidRequest }),
  /own inventory/,
);

const genericEmail = detailedEmailContent({
  title: 'Order update',
  message: 'Your order changed.',
  details: { Order: 'CM-1001' },
  actionUrl: '/orders/example',
});
assert(!genericEmail.html.includes('Open in ConMat'));
assert(!genericEmail.text.includes('Open in ConMat'));
assert(!genericEmail.html.includes('<a '), 'Email templates must not render action buttons.');
assert(genericEmail.html.includes('name="viewport"'), 'Email templates must declare a mobile viewport.');
assert(genericEmail.html.includes('@media only screen and (max-width:600px)'), 'Email templates must include their mobile layout.');
assert(genericEmail.html.includes('table-layout:fixed'), 'Email cards must prevent detail content from widening the layout.');
assert(genericEmail.html.includes('overflow-wrap:anywhere'), 'Email content must wrap long unbroken values.');
assert(genericEmail.html.includes('class="detail-label"'));
assert(genericEmail.html.includes('class="detail-value"'));

const paymentEmail = sellerPaymentEmail({
  order: { id: 'order-uuid-1001', orderNumber: 'CM-1001', buyerName: 'Test Buyer' },
  payout: {
    currency: 'pkr',
    grossAmount: 1000,
    commissionAmount: 10,
    netAmount: 990,
    payoutProvider: 'JazzCash',
    payoutDestination: 'JazzCash ending in 4567',
  },
  sellerItems: [{ productName: 'Cement', quantity: 10, unit: 'bag', unitPrice: 100, lineTotal: 1000 }],
  releaseReason: 'buyer_confirmation',
  settlement: { processor: 'ConMat Demo', reference: 'demo_payment_1001' },
  releasedAt: new Date('2026-09-03T12:00:00.000Z'),
});
assert.strictEqual(paymentEmail.title, 'Payment received (demo)');
assert(paymentEmail.message.includes('order ID CM-1001'));
assert(paymentEmail.message.includes('PKR 990.00'));
assert.strictEqual(paymentEmail.details['Order ID'], 'CM-1001');
assert.strictEqual(paymentEmail.details['Commission rate'], '1%');
assert.strictEqual(paymentEmail.details['ConMat commission deducted'], 'PKR 10.00');
assert.strictEqual(paymentEmail.details['Net payment received'], 'PKR 990.00');
assert.strictEqual(paymentEmail.details['Payment account'], 'JazzCash ending in 4567');
assert(paymentEmail.details['Your order items'].includes('Cement - 10 bag'));

console.log('Payment flow check passed: role reports, wholesale pricing, payout providers, encryption, commission, deadline, seller fulfillment, and email summaries.');
