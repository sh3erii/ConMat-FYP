const { Op } = require('sequelize');
const { Order, OrderItem, OrderStatusEvent, Payment, SellerPayout, User } = require('../models');
const {
  createOrderFromCart,
  hydrateOrder,
  canAccessOrder,
  nextFulfillmentStatus,
  aggregateFulfillmentStatus,
  syncOrderStatusFromItems,
  restoreReservedStock,
} = require('../services/orderService');
const { notifySafely, notifyActiveAdminsSafely } = require('../services/notificationService');
const { runInBackground, runSafely } = require('../services/asyncService');
const { number, dateText } = require('../services/formatters');
const { displayDate } = require('../services/securityLogService');
const {
  deliveryDeadlineFrom,
  ensureItemDeliveryResponseWindow,
  releaseSellerIfReady,
} = require('../services/autoReleaseService');
const { stripe } = require('../services/stripeService');

const money = (value) => `PKR ${Number(value || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
const itemSummary = (items) => items.map((item) => `${item.productName} - ${item.quantity} ${item.unit}`).join('\n');
const cancelledOrderPayload = (order) => ({
  ...(order.toJSON ? order.toJSON() : order),
  status: 'Cancelled',
  orderStatus: 'Cancelled',
});

async function sellerRecipients(orderId) {
  const items = await OrderItem.findAll({ where: { orderId }, order: [['createdAt', 'ASC']] });
  const sellerIds = [...new Set(items.map((item) => item.sellerId).filter(Boolean))];
  const sellers = sellerIds.length ? await User.findAll({
    where: { id: { [Op.in]: sellerIds } },
    attributes: ['id', 'name', 'companyName', 'email', 'role'],
  }) : [];
  return sellers.map((seller) => ({ seller, items: items.filter((item) => item.sellerId === seller.id) }));
}

async function notifyOrderSellers({ order, buyer, title, message, type = 'Order', event, note, eventDetails = null }) {
  return await runSafely('Seller order notifications skipped', async () => {
    const recipients = await sellerRecipients(order.id);
    await Promise.all(recipients.map(async ({ seller, items }) => await notifySafely({
      userId: seller.id,
      email: seller.email,
      title,
      message,
      type,
      actionUrl: '/supplier/incoming-orders',
      metadata: { event, orderId: order.id, orderNumber: order.orderNumber, buyerId: buyer.id },
      emailDetails: {
        'Order number': order.orderNumber,
        Buyer: buyer.name,
        'Buyer email': buyer.email,
        'Buyer phone': buyer.phone || order.contactPhone || 'Not provided',
        'Order total': money(order.totalAmount),
        'Delivery address': order.shippingAddress,
        'Your items': itemSummary(items),
        ...(eventDetails || {}),
        Note: note || 'No additional note',
        'Updated at': displayDate(new Date()),
      },
    }, 'Seller order notification skipped')));
  });
}

exports.createCheckoutOrder = async (req, res, next) => {
  try {
    if (!['Customer','Retailer','Wholesaler'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Only buyer roles can place checkout orders.' });
    const order = await createOrderFromCart({ buyer: req.user, body: req.body });
    res.status(201).json({ success: true, message: 'Order created successfully.', order });
  } catch (e) { next(e); }
};

exports.getMyOrders = async (req, res, next) => {
  try {
    const rows = await Order.findAll({ where: { buyerId: req.user.id }, order: [['createdAt','DESC']] });
    const orders = await Promise.all(rows.map(hydrateOrder));
    res.json({ success: true, orders, data: orders });
  } catch (e) { next(e); }
};

exports.getOrderDetail = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.orderId);
    if (!order || !(await canAccessOrder(req.user, order))) return res.status(404).json({ success: false, message: 'Order not found.' });
    res.json({ success: true, order: await hydrateOrder(order) });
  } catch (e) { next(e); }
};

exports.cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.orderId);
    if (!order || order.buyerId !== req.user.id) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (order.orderStatus === 'Cancelled') {
      return res.json({ success: true, alreadyCancelled: true, message: 'Order is already cancelled.', order: cancelledOrderPayload(order) });
    }
    if (order.paymentStatus === 'Paid' || ['Dispatched','Delivered'].includes(order.orderStatus)) return res.status(409).json({ success: false, message: 'This order can no longer be cancelled from checkout.' });
    const pendingPayment = await Payment.findOne({ where: { orderId: order.id } });
    if (pendingPayment?.stripePaymentIntentId) {
      if (!stripe) return res.status(503).json({ success: false, message: 'Payment cancellation is temporarily unavailable. Please try again before cancelling the order.' });
      const intent = await stripe.paymentIntents.retrieve(pendingPayment.stripePaymentIntentId);
      if (intent.status === 'succeeded') {
        return res.status(409).json({ success: false, message: 'Stripe has already completed this payment. Refresh the order before attempting cancellation.' });
      }
      if (intent.status !== 'canceled') await stripe.paymentIntents.cancel(intent.id);
      await pendingPayment.update({ status: 'Failed', fundsStatus: 'NotFunded' });
    }
    await restoreReservedStock(order);
    await order.update({ status: 'Cancelled', orderStatus: 'Cancelled', cancelledAt: new Date(), notes: [order.notes, req.body.reason].filter(Boolean).join('\n') });
    const cancelledItems = await OrderItem.findAll({ where: { orderId: order.id } });
    await OrderItem.update({ fulfillmentStatus: 'Cancelled' }, { where: { orderId: order.id } });
    await OrderStatusEvent.bulkCreate(cancelledItems.map((item) => ({
      orderId: order.id,
      orderItemId: item.id,
      sellerId: item.sellerId,
      status: 'Cancelled',
      description: req.body.reason || `${item.productName} was cancelled by the buyer.`,
      updatedBy: req.user.id,
    })));
    res.json({ success: true, message: 'Order cancelled.', order: cancelledOrderPayload(order) });

    runInBackground(`Post-cancellation work failed for ${order.orderNumber}`, async () => {
      await Promise.allSettled([
        OrderStatusEvent.create({ orderId: order.id, status: 'Cancelled', description: req.body.reason || 'Order cancelled by buyer.', updatedBy: req.user.id }),
        notifyOrderSellers({
          order,
          buyer: req.user,
          title: 'Order cancelled by buyer',
          message: `${req.user.name} cancelled order ${order.orderNumber}.`,
          event: 'buyer-cancelled-order',
          note: req.body.reason,
        }),
      ]);
    });
  } catch (e) { next(e); }
};

function payoutPayload(payout) {
  return payout ? {
    grossAmount: number(payout.grossAmount),
    commissionRate: number(payout.commissionRate),
    commissionAmount: number(payout.commissionAmount),
    netAmount: number(payout.netAmount),
    status: payout.status,
    payoutProvider: payout.payoutProvider,
    payoutDestination: payout.payoutDestination,
    releaseReason: payout.releaseReason,
    releasedAt: payout.releasedAt,
  } : null;
}

async function notifyItemSeller({ order, item, buyer, title, message, event, details = {} }) {
  const seller = await User.findByPk(item.sellerId, {
    attributes: ['id', 'name', 'companyName', 'email', 'role'],
  });
  if (!seller) return;
  await notifySafely({
    userId: seller.id,
    email: seller.email,
    title,
    message,
    type: 'Order',
    actionUrl: '/supplier/incoming-orders',
    metadata: {
      event,
      orderId: order.id,
      orderItemId: item.id,
      sellerId: seller.id,
      buyerId: buyer.id,
    },
    emailDetails: {
      'Order number': order.orderNumber,
      Product: item.productName,
      Quantity: `${item.quantity} ${item.unit}`,
      Buyer: buyer.name,
      'Delivery address': item.deliveryAddress || order.shippingAddress,
      'Delivery city': item.deliveryCity || order.city,
      ...details,
      'Updated at': displayDate(new Date()),
    },
  }, 'Seller product-order notification skipped');
}

// A seller receives only their own products and progresses each one independently.
exports.incoming = async (req, res, next) => {
  try {
    if (!['Supplier', 'Retailer', 'Wholesaler'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Seller account required.' });
    }
    const itemRows = await OrderItem.findAll({
      where: { sellerId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    const orderIds = [...new Set(itemRows.map((item) => item.orderId))];
    const orders = orderIds.length ? await Order.findAll({
      where: { id: { [Op.in]: orderIds } },
      order: [['createdAt', 'DESC']],
    }) : [];
    const buyerIds = [...new Set(orders.map((order) => order.buyerId))];
    const [buyers, payouts] = await Promise.all([
      buyerIds.length ? User.findAll({
        where: { id: { [Op.in]: buyerIds } },
        attributes: ['id', 'name', 'email', 'phone', 'city', 'role'],
      }) : [],
      orderIds.length ? SellerPayout.findAll({
        where: { orderId: { [Op.in]: orderIds }, sellerId: req.user.id },
      }) : [],
    ]);
    const buyerMap = Object.fromEntries(buyers.map((buyer) => [buyer.id, buyer.toJSON()]));
    const payoutMap = Object.fromEntries(payouts.map((payout) => [payout.orderId, payout]));
    const data = orders.map((order) => {
      const sellerItems = itemRows.filter((item) => item.orderId === order.id);
      const fulfillmentStatus = aggregateFulfillmentStatus(sellerItems);
      const sellerTotal = sellerItems.reduce((sum, item) => (
        sum + number(item.lineTotal) + number(item.deliveryCharge ?? item.productSnapshot?.appliedDeliveryCharge)
      ), 0);
      return {
        ...order.toJSON(),
        orderTotalAmount: number(order.totalAmount),
        totalAmount: sellerTotal,
        status: fulfillmentStatus,
        fulfillmentStatus,
        buyer: buyerMap[order.buyerId] || null,
        buyerName: buyerMap[order.buyerId]?.name || order.buyerName,
        contactPhone: sellerItems[0]?.contactPhone || order.contactPhone,
        shippingAddress: sellerItems[0]?.deliveryAddress || order.shippingAddress,
        items: sellerItems.map((item) => ({
          ...item.toJSON(),
          lineTotal: number(item.lineTotal),
          deliveryCharge: number(item.deliveryCharge ?? item.productSnapshot?.appliedDeliveryCharge),
          nextSellerStatus: order.paymentStatus === 'Paid'
            ? nextFulfillmentStatus(item.fulfillmentStatus)
            : null,
          payment: {
            buyerPaymentStatus: order.paymentStatus,
            sellerPayoutStatus: payoutMap[order.id]?.status || (order.paymentStatus === 'Paid' ? 'Pending' : 'NotFunded'),
          },
        })),
        itemCount: sellerItems.reduce((sum, item) => sum + item.quantity, 0),
        placedAt: dateText(order.createdAt),
        payout: payoutPayload(payoutMap[order.id]),
      };
    });
    return res.json({ success: true, orders: data, data });
  } catch (e) { return next(e); }
};

async function updateItemStatusResponse(req, res, next, itemId) {
  try {
    const order = await Order.findByPk(req.params.orderId);
    const item = order ? await OrderItem.findOne({ where: { id: itemId, orderId: order.id } }) : null;
    if (!order || !item) return res.status(404).json({ success: false, message: 'Order product not found.' });
    const sellerRole = ['Supplier', 'Retailer', 'Wholesaler'].includes(req.user.role);
    if (req.user.role !== 'Admin' && (!sellerRole || String(item.sellerId) !== String(req.user.id))) {
      return res.status(403).json({ success: false, message: 'You can update only products assigned to your seller account.' });
    }

    const allowed = ['Confirmed', 'Processing', 'Packed', 'Dispatched', 'Delivered', 'Payment Issue', 'Cancelled'];
    const status = req.body.orderStatus || req.body.status;
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Allowed: ${allowed.join(', ')}.` });
    }
    if (!['Cancelled', 'Payment Issue'].includes(status) && order.paymentStatus !== 'Paid') {
      return res.status(409).json({ success: false, message: 'The buyer payment must be confirmed before fulfillment can begin.' });
    }
    if (status === 'Cancelled' && order.paymentStatus === 'Paid') {
      return res.status(409).json({ success: false, message: 'A paid product cannot be cancelled until its payment is refunded.' });
    }

    const previousStatus = item.fulfillmentStatus || order.orderStatus || 'Placed';
    if (req.user.role !== 'Admin' && !['Cancelled', 'Payment Issue'].includes(status)) {
      const expectedStatus = nextFulfillmentStatus(previousStatus);
      if (status !== expectedStatus) {
        return res.status(409).json({
          success: false,
          message: `Product fulfillment must follow Confirmed → Processing → Packed → Dispatched → Delivered. The next status from ${previousStatus} is ${expectedStatus || 'not available'}.`,
        });
      }
    }

    const description = String(req.body.description || '').trim();
    const location = String(req.body.location || '').trim();
    if (description.length > 1000 || location.length > 120) {
      return res.status(400).json({ success: false, message: 'The tracking note or location is too long.' });
    }
    const deliveredAt = status === 'Delivered' ? new Date() : null;
    await item.update({
      fulfillmentStatus: status,
      sellerNote: description || item.sellerNote,
      trackingLocation: location || item.trackingLocation,
      deliveredAt,
      deliveryResponseDeadline: deliveredAt ? deliveryDeadlineFrom(deliveredAt) : null,
      deliveryResolution: deliveredAt ? 'AwaitingBuyer' : null,
    });
    const eventDescription = description || `${item.productName} status changed to ${status}.`;
    await OrderStatusEvent.create({
      orderId: order.id,
      orderItemId: item.id,
      sellerId: item.sellerId,
      status,
      description: eventDescription,
      location: location || null,
      updatedBy: req.user.id,
    });
    await syncOrderStatusFromItems(order);
    const buyer = await User.findByPk(order.buyerId);
    await notifySafely({
      userId: order.buyerId,
      email: buyer?.email,
      title: 'Product delivery status updated',
      message: `${item.productName} in order ${order.orderNumber} is now ${status}.`,
      type: 'Order',
      actionUrl: `/orders/${order.id}/tracking?item=${item.id}`,
      metadata: {
        event: 'seller-item-status',
        orderId: order.id,
        orderItemId: item.id,
        sellerId: item.sellerId,
        previousStatus,
        status,
      },
      emailDetails: {
        'Order number': order.orderNumber,
        Product: item.productName,
        'Previous status': previousStatus,
        'New status': status,
        Seller: req.user.companyName || req.user.name,
        'Delivery address': item.deliveryAddress || order.shippingAddress,
        Note: eventDescription,
        Location: location || item.deliveryCity || order.city || 'Not provided',
        'Updated at': displayDate(new Date()),
      },
    }, 'Buyer product-status notification skipped');
    return res.json({
      success: true,
      message: `${item.productName} moved to ${status}.`,
      item: item.toJSON(),
      order: await hydrateOrder(order),
    });
  } catch (e) { return next(e); }
}

exports.updateItemStatus = async (req, res, next) => (
  await updateItemStatusResponse(req, res, next, req.params.itemId)
);


exports.updateStatus = async (req, res, next) => {
  try {
    const where = { orderId: req.params.orderId };
    if (req.user.role !== 'Admin') where.sellerId = req.user.id;
    const items = await OrderItem.findAll({ where });
    if (items.length !== 1) {
      return res.status(409).json({
        success: false,
        message: 'Select a specific product to update its fulfillment status.',
      });
    }
    return await updateItemStatusResponse(req, res, next, items[0].id);
  } catch (e) { return next(e); }
};

async function confirmItemDeliveryCore({ order, item, buyer, note }) {
  if (item.fulfillmentStatus !== 'Delivered') {
    throw Object.assign(new Error('This product can be confirmed only after its seller marks it delivered.'), { status: 409 });
  }
  await ensureItemDeliveryResponseWindow(item);
  await item.reload();
  if (['BuyerConfirmed', 'AutoConfirmed'].includes(item.deliveryResolution)) {
    throw Object.assign(new Error('This product delivery is already confirmed.'), { status: 409 });
  }
  if (item.deliveryResolution === 'ReleaseProcessing') {
    throw Object.assign(new Error('This product delivery response is already being processed.'), { status: 409 });
  }
  const [claimed] = await OrderItem.update({ deliveryResolution: 'BuyerConfirmed' }, {
    where: { id: item.id, deliveryResolution: { [Op.in]: ['AwaitingBuyer', 'IssueReported', 'ReleaseFailed'] } },
  });
  if (!claimed) throw Object.assign(new Error('This product delivery response has already been recorded.'), { status: 409 });
  await item.reload();
  await OrderStatusEvent.create({
    orderId: order.id,
    orderItemId: item.id,
    sellerId: item.sellerId,
    status: 'Delivery Confirmed',
    description: note || `Buyer confirmed receipt of ${item.productName}.`,
    updatedBy: buyer.id,
  });
  await syncOrderStatusFromItems(order);

  let release = { released: false, pending: true, payouts: [] };
  let payoutWarning = false;
  try {
    release = await releaseSellerIfReady(order, item.sellerId, 'buyer_confirmation');
  } catch (error) {
    payoutWarning = true;
    console.warn(`Seller payout remains pending for ${order.orderNumber}, seller ${item.sellerId}: ${error.message}`);
  }
  const commissionAmount = release.payouts.reduce((sum, payout) => sum + number(payout.commissionAmount), 0);
  const sellerPaymentAmount = release.payouts.reduce((sum, payout) => sum + number(payout.netAmount), 0);
  runInBackground(`Post-confirmation notifications failed for item ${item.id}`, async () => {
    if (!release.released || payoutWarning) {
      await notifyItemSeller({
        order,
        item,
        buyer,
        title: 'Buyer confirmed a product delivery',
        message: `${buyer.name} confirmed receipt of ${item.productName} in order ${order.orderNumber}.`,
        event: 'buyer-confirmed-item-delivery',
        details: {
          'Buyer note': note || 'No additional note',
          'Payout status': payoutWarning ? 'Queued for review' : 'Held until your other products in this order are confirmed',
        },
      });
    }
    await notifyActiveAdminsSafely({
      title: 'Product delivery confirmed by buyer',
      message: `${buyer.name} confirmed ${item.productName} in order ${order.orderNumber}.`,
      type: 'Order',
      actionUrl: '/admin/orders',
      metadata: {
        event: 'admin-item-delivery-confirmed',
        orderId: order.id,
        orderItemId: item.id,
        sellerId: item.sellerId,
        payoutReleased: release.released,
      },
      emailDetails: {
        'Order ID': order.orderNumber,
        Product: item.productName,
        Customer: buyer.name,
        'Commission deducted': release.released ? money(commissionAmount) : 'Not released yet',
        'Seller payment': release.released ? money(sellerPaymentAmount) : 'Still held',
        'Customer note': note || 'No additional note',
      },
    }, 'Admin product-confirmation notifications skipped');
  });
  return { release, payoutWarning };
}

exports.confirmItemDelivery = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.orderId);
    const item = order ? await OrderItem.findOne({ where: { id: req.params.itemId, orderId: order.id } }) : null;
    if (!order || !item || String(order.buyerId) !== String(req.user.id)) {
      return res.status(404).json({ success: false, message: 'Order product not found.' });
    }
    const note = String(req.body.note || '').trim();
    if (note.length > 1000) return res.status(400).json({ success: false, message: 'The confirmation note cannot exceed 1000 characters.' });
    const { release, payoutWarning } = await confirmItemDeliveryCore({ order, item, buyer: req.user, note });
    const message = payoutWarning
      ? 'Delivery confirmed. The seller payout remains protected and is queued for review.'
      : release.released
        ? 'Delivery confirmed and this seller payout was released.'
        : 'Delivery confirmed. This seller payout remains held until their other products in this order are confirmed.';
    return res.json({ success: true, message, payoutPending: !release.released, order: await hydrateOrder(order) });
  } catch (e) { return e.status ? res.status(e.status).json({ success: false, message: e.message }) : next(e); }
};

exports.confirmDelivery = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.orderId);
    if (!order || String(order.buyerId) !== String(req.user.id)) return res.status(404).json({ success: false, message: 'Order not found.' });
    const items = await OrderItem.findAll({ where: { orderId: order.id, fulfillmentStatus: 'Delivered' } });
    const unresolved = items.filter((item) => !['BuyerConfirmed', 'AutoConfirmed'].includes(item.deliveryResolution));
    if (unresolved.length !== 1) {
      return res.status(409).json({ success: false, message: 'Confirm each delivered product separately so every seller remains independent.' });
    }
    req.params.itemId = unresolved[0].id;
    return await exports.confirmItemDelivery(req, res, next);
  } catch (e) { return next(e); }
};

async function reportItemIssueCore({ order, item, buyer, reason, details }) {
  if (item.fulfillmentStatus !== 'Delivered') {
    throw Object.assign(new Error('An issue can be reported after this product is marked delivered.'), { status: 409 });
  }
  await ensureItemDeliveryResponseWindow(item);
  await item.reload();
  if (item.deliveryResolution === 'IssueReported') {
    throw Object.assign(new Error('An issue has already been reported for this product.'), { status: 409 });
  }
  if (['BuyerConfirmed', 'AutoConfirmed'].includes(item.deliveryResolution)) {
    throw Object.assign(new Error('This product delivery has already been confirmed.'), { status: 409 });
  }
  if (item.deliveryResolution !== 'AwaitingBuyer') {
    throw Object.assign(new Error('The delivery response for this product is already being processed.'), { status: 409 });
  }
  const issueNote = [reason, details].filter(Boolean).join(': ');
  const [claimed] = await OrderItem.update({ deliveryResolution: 'IssueReported' }, {
    where: { id: item.id, deliveryResolution: 'AwaitingBuyer' },
  });
  if (!claimed) throw Object.assign(new Error('This product delivery response has already been recorded.'), { status: 409 });
  await item.reload();
  await OrderStatusEvent.create({
    orderId: order.id,
    orderItemId: item.id,
    sellerId: item.sellerId,
    status: 'Issue Reported',
    description: issueNote,
    updatedBy: buyer.id,
  });
  await syncOrderStatusFromItems(order);
}

exports.reportItemIssue = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.orderId);
    const item = order ? await OrderItem.findOne({ where: { id: req.params.itemId, orderId: order.id } }) : null;
    if (!order || !item || String(order.buyerId) !== String(req.user.id)) {
      return res.status(404).json({ success: false, message: 'Order product not found.' });
    }
    const reason = String(req.body.reason || '').trim();
    const details = String(req.body.details || req.body.note || '').trim();
    if (!reason) return res.status(400).json({ success: false, message: 'An issue reason is required.' });
    if (reason.length > 120 || details.length > 1000) return res.status(400).json({ success: false, message: 'The issue reason or details are too long.' });
    await reportItemIssueCore({ order, item, buyer: req.user, reason, details });
    return res.json({
      success: true,
      message: `Automatic payment release is paused for ${item.productName}. You can still confirm delivery manually after the issue is solved.`,
      order: await hydrateOrder(order),
    });
  } catch (e) { return e.status ? res.status(e.status).json({ success: false, message: e.message }) : next(e); }
};

exports.reportOrderIssue = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.orderId);
    if (!order || String(order.buyerId) !== String(req.user.id)) return res.status(404).json({ success: false, message: 'Order not found.' });
    const items = await OrderItem.findAll({ where: { orderId: order.id, fulfillmentStatus: 'Delivered' } });
    const unresolved = items.filter((item) => !['BuyerConfirmed', 'AutoConfirmed', 'IssueReported'].includes(item.deliveryResolution));
    if (unresolved.length !== 1) {
      return res.status(409).json({ success: false, message: 'Select the affected product so only its seller and payout are involved.' });
    }
    req.params.itemId = unresolved[0].id;
    return await exports.reportItemIssue(req, res, next);
  } catch (e) { return next(e); }
};

exports.paymentSummary = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.orderId);
    if (!order || !(await canAccessOrder(req.user, order))) return res.status(404).json({ success: false, message: 'Order not found.' });
    const hydrated = await hydrateOrder(order);
    const data = {
      id: order.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderStatus: hydrated.fulfillmentStatus,
      status: hydrated.fulfillmentStatus,
      items: hydrated.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        sellerId: item.sellerId,
        seller: item.seller,
        name: item.productName,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: number(item.unitPrice),
        total: number(item.lineTotal),
        deliveryCharge: number(item.deliveryCharge),
        itemTotal: number(item.itemTotal),
        fulfillmentStatus: item.fulfillmentStatus,
        delivery: {
          address: item.deliveryAddress,
          city: item.deliveryCity,
          contactPhone: item.contactPhone,
          window: item.deliveryWindow,
          buyerNote: item.buyerNote,
          sellerNote: item.sellerNote,
        },
        payment: item.payment,
      })),
      subtotal: number(order.subtotal),
      deliveryCharges: number(order.shippingFee),
      discount: number(order.discount),
      grandTotal: number(order.totalAmount),
      paymentStatus: order.paymentStatus,
      fundsStatus: hydrated.fundsStatus,
      commissionAmount: hydrated.payouts.reduce((sum, payout) => sum + number(payout.commissionAmount), 0),
      sellerPayoutAmount: hydrated.payouts.reduce((sum, payout) => sum + number(payout.netAmount), 0),
    };
    return res.json({ success: true, data });
  } catch (e) { return next(e); }
};

exports.tracking = async (req, res, next) => {
  try {
    let order = await Order.findByPk(req.params.orderIdOrNumber);
    if (!order) order = await Order.findOne({ where: { orderNumber: req.params.orderIdOrNumber } });
    if (!order || !(await canAccessOrder(req.user, order))) return res.status(404).json({ success: false, message: 'Order not found.' });
    const hydrated = await hydrateOrder(order);
    const events = hydrated.timeline.map((event) => ({ ...event, status: event.title, completed: true }));
    const data = {
      order: {
        id: hydrated.id,
        orderNumber: hydrated.orderNumber,
        orderStatus: hydrated.orderStatus,
        fulfillmentStatus: hydrated.fulfillmentStatus,
        paymentStatus: hydrated.paymentStatus,
      },
      events,
      items: hydrated.items,
    };
    return res.json({ success: true, data, ...data });
  } catch (e) { return next(e); }
};
