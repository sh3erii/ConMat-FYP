require('dotenv').config();

const assert = require('assert');
const {
  aggregateFulfillmentStatus,
  storedOrderStatus,
  estimateDeliveryWindow,
  nextFulfillmentStatus,
  FULFILLMENT_SEQUENCE,
} = require('../services/orderService');
const { deliveryDeadlineFrom } = require('../services/autoReleaseService');
const { deriveFundsStatus } = require('../services/payoutService');

// 1. Status progression sequence
assert.deepStrictEqual(FULFILLMENT_SEQUENCE, ['Confirmed', 'Processing', 'Packed', 'Dispatched', 'Delivered']);
assert.strictEqual(nextFulfillmentStatus('Confirmed'), 'Processing');
assert.strictEqual(nextFulfillmentStatus('Processing'), 'Packed');
assert.strictEqual(nextFulfillmentStatus('Packed'), 'Dispatched');
assert.strictEqual(nextFulfillmentStatus('Dispatched'), 'Delivered');
assert.strictEqual(nextFulfillmentStatus('Delivered'), null);

// 2. Order status must not jump to 'Delivered' when only one seller has delivered
const seller1Item = { id: 'item-1', sellerId: 'seller-1', fulfillmentStatus: 'Delivered' };
const seller2ItemPending = { id: 'item-2', sellerId: 'seller-2', fulfillmentStatus: 'Processing' };
const seller2ItemConfirmed = { id: 'item-2', sellerId: 'seller-2', fulfillmentStatus: 'Confirmed' };
const seller2ItemPacked = { id: 'item-2', sellerId: 'seller-2', fulfillmentStatus: 'Packed' };
const seller2ItemDispatched = { id: 'item-2', sellerId: 'seller-2', fulfillmentStatus: 'Dispatched' };
const seller2ItemDelivered = { id: 'item-2', sellerId: 'seller-2', fulfillmentStatus: 'Delivered' };

// Stored order status represents the slowest active progress in the order
assert.strictEqual(storedOrderStatus([seller1Item, seller2ItemConfirmed]), 'Confirmed');
assert.strictEqual(storedOrderStatus([seller1Item, seller2ItemPending]), 'Processing');
assert.strictEqual(storedOrderStatus([seller1Item, seller2ItemPacked]), 'Packed');
assert.strictEqual(storedOrderStatus([seller1Item, seller2ItemDispatched]), 'Dispatched');
assert.strictEqual(storedOrderStatus([seller1Item, seller2ItemDelivered]), 'Delivered');

// Buyer-facing aggregate fulfillment status
assert.strictEqual(aggregateFulfillmentStatus([seller1Item, seller2ItemConfirmed]), 'Partially Delivered');
assert.strictEqual(aggregateFulfillmentStatus([seller1Item, seller2ItemPending]), 'Partially Delivered');
assert.strictEqual(aggregateFulfillmentStatus([seller1Item, seller2ItemDelivered]), 'Delivered');
assert.strictEqual(aggregateFulfillmentStatus([seller2ItemPending, seller2ItemDispatched]), 'Mixed Progress');
assert.strictEqual(aggregateFulfillmentStatus([seller2ItemConfirmed, seller2ItemConfirmed]), 'Confirmed');

// 3. Delivery window calculation for multiple sellers in different cities
assert.strictEqual(estimateDeliveryWindow('Lahore', ['Lahore']), '3–6 hours');
assert.strictEqual(estimateDeliveryWindow('Lahore', ['Lahore', 'Karachi']), '2–3 days');
assert.strictEqual(estimateDeliveryWindow('Karachi', ['Karachi']), '3–6 hours');

// 4. 24-hour response deadline calculation
const deliveredTimestamp = new Date('2026-09-05T12:00:00.000Z');
const deadline = deliveryDeadlineFrom(deliveredTimestamp);
assert.strictEqual(deadline.getTime() - deliveredTimestamp.getTime(), 24 * 60 * 60 * 1000);

// 5. Releasing one seller must leave a multi-seller payment partially released.
assert.strictEqual(deriveFundsStatus(
  ['seller-1', 'seller-2'],
  [{ sellerId: 'seller-1', status: 'Transferred' }]
), 'PartiallyReleased');
assert.strictEqual(deriveFundsStatus(
  ['seller-1', 'seller-2'],
  [
    { sellerId: 'seller-1', status: 'Transferred' },
    { sellerId: 'seller-2', status: 'Transferred' },
  ]
), 'Released');
assert.strictEqual(deriveFundsStatus(['seller-1'], [{ sellerId: 'seller-1', status: 'Failed' }], true), 'ReleaseFailed');

console.log('Multi-seller independent fulfillment check passed: status isolation, payout isolation, aggregate calculations, delivery windows, and response windows.');
