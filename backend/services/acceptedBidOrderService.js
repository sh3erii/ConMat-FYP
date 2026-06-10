// ============================================================
//  services/acceptedBidOrderService.js  (Muhammad Nosherwan – 076926)
//  Day 6 – Convert accepted bid offers into order records
// ============================================================
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');

let OrderStatusHistory = null;
try {
  OrderStatusHistory = require('../models/OrderStatusHistory');
} catch (error) {
  console.warn('OrderStatusHistory model not found yet. Day 5 history creation will be skipped.');
}

let generateOrderNumber = () => `ORD-${Date.now()}`;
try {
  const orderNumberService = require('./orderNumberService');
  if (orderNumberService.generateOrderNumber) generateOrderNumber = orderNumberService.generateOrderNumber;
} catch (error) {
  console.warn('orderNumberService not found. Using fallback order number.');
}

const toMoney = (value) => Number(Number(value || 0).toFixed(2));

const createOrderFromAcceptedBid = async ({ bidRequest, offer, buyer, shippingAddress, contactPhone, notes }) => {
  const quantity = Number(bidRequest.requiredQuantity || 1);
  const unitPrice = Number(offer.bidAmount || 0);
  const subtotal = toMoney(quantity * unitPrice);
  const shippingFee = 0;
  const taxAmount = 0;
  const totalAmount = toMoney(subtotal + shippingFee + taxAmount);

  const order = await Order.create({
    orderNumber: generateOrderNumber(),
    buyerId: buyer.id,
    buyerRole: buyer.role || 'Wholesaler',
    subtotal,
    shippingFee,
    taxAmount,
    totalAmount,
    status: 'Pending',
    orderStatus: 'Placed',
    paymentStatus: 'Pending',
    shippingAddress: shippingAddress || bidRequest.deliveryAddress || 'Address will be confirmed by buyer.',
    contactPhone: contactPhone || buyer.phone || '03000000000',
    notes: notes || `Created from accepted bid request ${bidRequest.id}`
  });

  await OrderItem.create({
    orderId: order.id,
    productId: bidRequest.productId || '00000000-0000-0000-0000-000000000000',
    sellerId: offer.supplierId,
    productName: bidRequest.title,
    category: bidRequest.category,
    unit: bidRequest.unit || 'piece',
    quantity,
    pricingType: 'wholesale',
    unitPrice,
    lineTotal: subtotal,
    productSnapshot: {
      bidRequestId: bidRequest.id,
      acceptedOfferId: offer.id,
      targetPrice: bidRequest.targetPrice,
      city: bidRequest.city
    }
  });

  if (OrderStatusHistory) {
    await OrderStatusHistory.create({
      orderId: order.id,
      status: 'Placed',
      title: 'Order created from accepted bid',
      description: `Accepted bid offer ${offer.id} was converted into an order.`,
      changedBy: buyer.id
    });
  }

  return order;
};

module.exports = { createOrderFromAcceptedBid };
