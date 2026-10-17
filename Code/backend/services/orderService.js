const { Op } = require('sequelize');
const { Order, OrderItem, OrderStatusEvent, Product, User, Invoice, Payment, SellerPayout } = require('../models');
const { number } = require('./formatters');
const { notifySafely } = require('./notificationService');
const { runInBackground } = require('./asyncService');
const { resolveProductPricing } = require('./productPricingService');
const { defaultMethodsForSellers } = require('./payoutMethodService');
const { ordersDB, productsDB } = require('../config/database');
const { emitToUser, emitToRole, emitMarketplaceUpdate } = require('./socketService');

const money = (value) => `PKR ${Number(value || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
const preparedDeliveryText = (rows) => rows.map(({ product, qty, deliveryAddress, deliveryCity, contactPhone, buyerNote, deliveryWindow, deliveryCharge }) => (
  `${product.name} - ${qty} ${product.unit}\nAddress: ${deliveryAddress}\nCity: ${deliveryCity}\nContact: ${contactPhone}\nEstimated delivery: ${deliveryWindow}\nDelivery charge: ${number(deliveryCharge) ? money(deliveryCharge) : 'Free'}\nBuyer note: ${buyerNote || 'No product-specific note'}`
)).join('\n\n');
const FULFILLMENT_SEQUENCE = ['Confirmed', 'Processing', 'Packed', 'Dispatched', 'Delivered'];
const SAME_CITY_DELIVERY_WINDOW = '3–6 hours';
const OUT_OF_CITY_DELIVERY_WINDOW = '2–3 days';

const normalizedCity = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();

function estimateDeliveryWindow(buyerCity, sellerCities = []) {
  const buyer = normalizedCity(buyerCity);
  const sellers = sellerCities.map(normalizedCity);
  return buyer && sellers.length && sellers.every((sellerCity) => sellerCity && sellerCity === buyer)
    ? SAME_CITY_DELIVERY_WINDOW
    : OUT_OF_CITY_DELIVERY_WINDOW;
}

function nextFulfillmentStatus(status) {
  const index = FULFILLMENT_SEQUENCE.indexOf(status);
  return index >= 0 && index < FULFILLMENT_SEQUENCE.length - 1 ? FULFILLMENT_SEQUENCE[index + 1] : null;
}

function aggregateFulfillmentStatus(items = []) {
  const statuses = items.map((item) => item.fulfillmentStatus || item.orderStatus || 'Placed');
  if (!statuses.length) return 'Placed';
  if (statuses.every((status) => status === statuses[0])) return statuses[0];
  const delivered = statuses.filter((status) => status === 'Delivered').length;
  return delivered > 0 && delivered < statuses.length ? 'Partially Delivered' : 'Mixed Progress';
}

function storedOrderStatus(items = []) {
  const statuses = items.map((item) => item.fulfillmentStatus || 'Placed');
  if (!statuses.length) return 'Placed';
  if (statuses.every((status) => status === 'Cancelled')) return 'Cancelled';
  if (statuses.some((status) => status === 'Payment Issue')) return 'Payment Issue';
  const active = statuses.filter((status) => status !== 'Cancelled');
  if (active.every((status) => status === 'Delivered')) return 'Delivered';
  const progression = ['Placed', ...FULFILLMENT_SEQUENCE];
  return active.reduce((slowest, status) => (
    progression.indexOf(status) < progression.indexOf(slowest) ? status : slowest
  ), active[0] || 'Placed');
}

async function syncOrderStatusFromItems(order) {
  const items = await OrderItem.findAll({ where: { orderId: order.id } });
  const orderStatus = storedOrderStatus(items);
  const deliveredItems = items.filter((item) => item.fulfillmentStatus === 'Delivered');
  const allDelivered = items.length > 0 && deliveredItems.length === items.length;
  const resolutions = deliveredItems.map((item) => item.deliveryResolution).filter(Boolean);
  const update = { orderStatus };
  if (allDelivered) {
    update.deliveredAt = deliveredItems.reduce((latest, item) => (
      !latest || (item.deliveredAt && new Date(item.deliveredAt) > new Date(latest)) ? item.deliveredAt : latest
    ), null);
    update.deliveryResponseDeadline = deliveredItems.reduce((latest, item) => (
      !latest || (item.deliveryResponseDeadline && new Date(item.deliveryResponseDeadline) > new Date(latest)) ? item.deliveryResponseDeadline : latest
    ), null);
    update.deliveryResolution = resolutions.some((status) => status === 'IssueReported')
      ? 'IssueReported'
      : resolutions.some((status) => ['AwaitingBuyer', 'ReleaseProcessing', 'ReleaseFailed'].includes(status))
        ? 'AwaitingBuyer'
        : resolutions.length === items.length
          ? (resolutions.every((status) => status === 'AutoConfirmed') ? 'AutoConfirmed' : 'BuyerConfirmed')
          : null;
  } else {
    update.deliveredAt = null;
    update.deliveryResponseDeadline = null;
    update.deliveryResolution = null;
  }
  if (orderStatus === 'Cancelled') Object.assign(update, { status: 'Cancelled', cancelledAt: order.cancelledAt || new Date() });
  await order.update(update);
  return items;
}

async function confirmPaidOrderItems(order, updatedBy = null) {
  const items = await OrderItem.findAll({ where: { orderId: order.id, fulfillmentStatus: 'Placed' } });
  if (!items.length) return [];
  await OrderItem.update({ fulfillmentStatus: 'Confirmed' }, { where: { id: { [Op.in]: items.map((item) => item.id) } } });
  await OrderStatusEvent.bulkCreate(items.map((item) => ({
    orderId: order.id,
    orderItemId: item.id,
    sellerId: item.sellerId,
    status: 'Confirmed',
    description: `Payment confirmed. ${item.productName} is ready for seller fulfillment.`,
    updatedBy,
  })));
  await syncOrderStatusFromItems(order);
  return items;
}

function productDeliveryCharge(product, quantity, deliveryCity = '') {
  const isWithinCity = normalizedCity(deliveryCity) === normalizedCity(product.city);
  const charge = Math.max(0, number(
    isWithinCity ? product.withinCityDeliveryCharge : product.deliveryCharge
  ));
  const freeFrom = product.freeDeliveryMinQuantity == null
    ? null
    : Math.max(1, Math.floor(number(product.freeDeliveryMinQuantity)));
  return charge === 0 || (freeFrom && quantity >= freeFrom) ? 0 : charge;
}

function productWholesaleDiscount(product, sellerRole, pricingType, unitPrice, quantity) {
  const isWholesaler = String(sellerRole || '').trim().toLowerCase() === 'wholesaler';
  const usesWholesalePrice = String(pricingType || '').trim().toLowerCase() === 'wholesale';
  const retailPrice = number(product?.retailPrice);
  const chargedUnitPrice = number(unitPrice);
  return isWholesaler && usesWholesalePrice && retailPrice > chargedUnitPrice
    ? (retailPrice - chargedUnitPrice) * Math.max(0, Math.floor(number(quantity)))
    : 0;
}

async function sendOrderCreatedNotifications({ order, buyer, prepared, verifiedSellers }) {
  await Promise.all([
    notifySafely({
      userId: buyer.id,
      email: buyer.email,
      title: 'Order placed',
      message: `Your order ${order.orderNumber} has been created and the sellers have been notified.`,
      type: 'Order',
      actionUrl: `/orders/${order.id}`,
      metadata: { event: 'order-placed', orderId: order.id, orderNumber: order.orderNumber },
      emailDetails: {
        'Order number': order.orderNumber,
        'Products and delivery details': preparedDeliveryText(prepared),
        Subtotal: money(order.subtotal),
        ...(number(order.discount) > 0 ? { 'Wholesale discount': `-${money(order.discount)}` } : {}),
        Delivery: number(order.shippingFee) === 0 ? 'Free' : money(order.shippingFee),
        Total: money(order.totalAmount),
        'Delivery address': order.shippingAddress,
        'Contact phone': order.contactPhone,
        'Payment status': order.paymentStatus,
      },
    }),
    ...verifiedSellers.map(async (seller) => {
      const sellerItems = prepared.filter(({ product }) => product.sellerId === seller.id);
      const sellerTotal = sellerItems.reduce((sum, item) => sum + item.lineTotal + item.deliveryCharge, 0);
      return await notifySafely({
        userId: seller.id,
        email: seller.email,
        title: 'New order received',
        message: `${order.orderNumber} includes products from ${seller.companyName || seller.name}. Review it in Incoming Orders.`,
        type: 'Order',
        actionUrl: '/supplier/incoming-orders',
        metadata: { orderId: order.id, orderNumber: order.orderNumber },
        emailDetails: {
          'Order number': order.orderNumber,
          Buyer: buyer.name,
          'Buyer email': buyer.email,
          'Your products and delivery details': preparedDeliveryText(sellerItems),
          'Your products total': money(sellerTotal),
          'Payment status': order.paymentStatus,
        },
      });
    }),
  ]);
}

function orderNumber() {
  return `CM-ORD-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`;
}

async function hydrateOrder(order) {
  if (!order) return null;
  const plain = order.toJSON ? order.toJSON() : { ...order };
  const [items, timelineRows, invoice, payment, payouts] = await Promise.all([
    OrderItem.findAll({ where: { orderId: plain.id }, order: [['createdAt', 'ASC']] }),
    OrderStatusEvent.findAll({ where: { orderId: plain.id, visibleToBuyer: true }, order: [['createdAt', 'ASC']] }),
    Invoice.findOne({ where: { orderId: plain.id } }).catch(() => null),
    Payment.findOne({ where: { orderId: plain.id } }),
    SellerPayout.findAll({ where: { orderId: plain.id }, order: [['createdAt', 'ASC']] }),
  ]);
  const sellerIds = [...new Set(items.map((i) => i.sellerId).filter(Boolean))];
  const sellers = sellerIds.length ? await User.findAll({ where: { id: { [Op.in]: sellerIds } }, attributes: ['id','name','companyName','role','city','email','phone'] }) : [];
  const sellerMap = Object.fromEntries(sellers.map((s) => [s.id, s.toJSON()]));
  const sellerNames = [...new Set(sellers.map((s) => s.companyName || s.name).filter(Boolean))];
  const payoutMap = Object.fromEntries(payouts.map((payout) => [payout.sellerId, payout]));
  const globalTimeline = timelineRows.filter((event) => !event.orderItemId);

  plain.items = items.map((i) => {
    const raw = i.toJSON();
    const snapshot = raw.productSnapshot || {};
    const payout = payoutMap[raw.sellerId];
    const specificTimeline = timelineRows.filter((event) => String(event.orderItemId || '') === String(raw.id));
    const itemTimelineRows = specificTimeline.length ? specificTimeline : globalTimeline;
    const deliveryCharge = number(raw.deliveryCharge ?? snapshot.appliedDeliveryCharge);
    return {
      ...raw,
      name: raw.productName,
      image: snapshot.imageUrl || '',
      seller: sellerMap[i.sellerId] || null,
      fulfillmentStatus: raw.fulfillmentStatus || plain.orderStatus,
      deliveryAddress: raw.deliveryAddress || plain.shippingAddress,
      deliveryCity: raw.deliveryCity || plain.city,
      contactPhone: raw.contactPhone || plain.contactPhone,
      deliveryWindow: raw.deliveryWindow || estimateDeliveryWindow(raw.deliveryCity || plain.city, [sellerMap[i.sellerId]?.city]),
      deliveryCharge,
      buyerNote: raw.buyerNote ?? plain.notes,
      lineTotal: number(raw.lineTotal),
      itemTotal: number(raw.lineTotal) + deliveryCharge,
      payment: {
        buyerPaymentStatus: plain.paymentStatus,
        fundsStatus: payment?.fundsStatus || (plain.paymentStatus === 'Paid' ? 'Held' : 'NotFunded'),
        sellerPayoutStatus: payout?.status || (plain.paymentStatus === 'Paid' ? 'Pending' : 'NotFunded'),
        sellerGrossAmount: payout ? number(payout.grossAmount) : null,
        sellerCommissionAmount: payout ? number(payout.commissionAmount) : null,
        sellerNetAmount: payout ? number(payout.netAmount) : null,
      },
      deliveryConfirmed: ['BuyerConfirmed', 'AutoConfirmed'].includes(raw.deliveryResolution),
      deliveryConfirmationType: raw.deliveryResolution === 'AutoConfirmed' ? 'automatic' : raw.deliveryResolution === 'BuyerConfirmed' ? 'buyer' : null,
      issueReported: raw.deliveryResolution === 'IssueReported',
      timeline: itemTimelineRows.map((event) => ({
        id: event.id,
        status: event.status,
        title: event.status,
        description: event.description,
        location: event.location,
        date: event.createdAt ? new Date(event.createdAt).toLocaleString('en-PK') : '',
        createdAt: event.createdAt,
        completed: true,
      })),
    };
  });
  plain.fulfillmentStatus = aggregateFulfillmentStatus(plain.items);
  plain.supplier = sellerNames.length === 1 ? sellerNames[0] : sellerNames.length ? 'Multiple ConMat sellers' : 'ConMat Seller';
  plain.supplierName = plain.supplier;
  plain.deliveryWindow = estimateDeliveryWindow(plain.city, sellers.map((seller) => seller.city));
  plain.total = Number(plain.totalAmount || 0);
  plain.deliveryFee = Number(plain.shippingFee || 0);
  plain.address = plain.shippingAddress;
  plain.deliveryAddress = plain.shippingAddress;
  plain.deliveryDate = plain.deliveryWindow || '';
  plain.status = plain.fulfillmentStatus;
  plain.invoiceId = invoice?.id || null;
  plain.invoiceNumber = invoice?.invoiceNumber || null;
  plain.fundsStatus = payment?.fundsStatus || (plain.paymentStatus === 'Paid' ? 'Held' : 'NotFunded');
  plain.payouts = payouts.map((payout) => ({
    id: payout.id,
    sellerId: payout.sellerId,
    grossAmount: number(payout.grossAmount),
    commissionRate: number(payout.commissionRate),
    commissionAmount: number(payout.commissionAmount),
    netAmount: number(payout.netAmount),
    currency: payout.currency,
    status: payout.status,
    releasedAt: payout.releasedAt,
  }));
  plain.timeline = globalTimeline.map((event) => ({
    id: event.id,
    title: event.status,
    description: event.description,
    date: event.createdAt ? new Date(event.createdAt).toLocaleString('en-PK') : '',
    createdAt: event.createdAt,
  }));
  plain.deliveryConfirmed = plain.items.length > 0 && plain.items.every((item) => (
    item.fulfillmentStatus === 'Delivered' && ['BuyerConfirmed', 'AutoConfirmed'].includes(item.deliveryResolution)
  ));
  plain.deliveryConfirmationType = plain.deliveryConfirmed && plain.items.every((item) => item.deliveryResolution === 'AutoConfirmed')
    ? 'automatic'
    : plain.deliveryConfirmed ? 'buyer' : null;
  plain.issueReported = plain.items.some((item) => item.deliveryResolution === 'IssueReported');
  plain.deliveryResponseDeadline = plain.deliveryResponseDeadline || null;
  return plain;
}

async function createOrderFromCart({ buyer, body, sourceBidOfferId = null }) {
  const checkoutToken = String(body.checkoutToken || '').trim();
  if (checkoutToken && !/^[a-zA-Z0-9_-]{16,80}$/.test(checkoutToken)) {
    throw Object.assign(new Error('The checkout session is invalid. Return to your cart and try again.'), { status: 400 });
  }
  if (checkoutToken) {
    const existingOrder = await Order.findOne({ where: { buyerId: buyer.id, checkoutToken } });
    if (existingOrder) return await hydrateOrder(existingOrder);
  }

  const submittedItems = Array.isArray(body.items) ? body.items : [];
  if (!submittedItems.length) throw Object.assign(new Error('At least one item is required.'), { status: 400 });
  if (submittedItems.some((item) => !item.productId)) throw Object.assign(new Error('Each order item needs a valid productId.'), { status: 400 });

  const quantitiesByProduct = new Map();
  const submittedByProduct = new Map();
  for (const item of submittedItems) {
    const quantity = Math.floor(number(item.quantity));
    if (quantity < 1) throw Object.assign(new Error('Each order item needs a valid quantity.'), { status: 400 });
    quantitiesByProduct.set(item.productId, (quantitiesByProduct.get(item.productId) || 0) + quantity);
    if (!submittedByProduct.has(item.productId)) submittedByProduct.set(item.productId, item);
  }
  const rawItems = [...quantitiesByProduct.entries()].map(([productId, quantity]) => ({ productId, quantity }));
  const productIds = rawItems.map((item) => item.productId);

  const products = await Product.findAll({ where: { id: { [Op.in]: productIds } } });
  const map = Object.fromEntries(products.map((p) => [p.id, p]));
  if (products.length !== productIds.length) throw Object.assign(new Error('One or more products no longer exist.'), { status: 409 });

  const sellerIds = [...new Set(products.map((product) => product.sellerId))];
  if (sellerIds.some((sellerId) => String(sellerId) === String(buyer.id))) {
    throw Object.assign(new Error('You cannot purchase your own product. Remove your listing from the cart before checkout.'), { status: 400 });
  }
  const verifiedSellers = sellerIds.length ? await User.findAll({
    where: { id: { [Op.in]: sellerIds }, status: 'Active', verificationStatus: 'Approved' },
    attributes: ['id','role','name','companyName','email','city'],
  }) : [];
  const verifiedSellerIds = new Set(verifiedSellers.map((seller) => seller.id));
  const sellerRoleMap = Object.fromEntries(verifiedSellers.map((seller) => [seller.id, seller.role]));
  if (sellerIds.some((id) => !verifiedSellerIds.has(id))) {
    throw Object.assign(new Error('One or more sellers are no longer verified for marketplace orders.'), { status: 409 });
  }
  const sellerPayoutMethods = await defaultMethodsForSellers(sellerIds);
  if (sellerIds.some((sellerId) => !sellerPayoutMethods.has(sellerId))) {
    throw Object.assign(new Error('One or more sellers have not added a payout method. Please remove those products or ask the seller to add JazzCash, Easypaisa, NayaPay, UBL, or Meezan Bank in Settings.'), { status: 409 });
  }

  const prepared = [];
  for (const raw of rawItems) {
    const product = map[raw.productId];
    const qty = Math.floor(number(raw.quantity));
    if (qty < 1) throw Object.assign(new Error(`Invalid quantity for ${product.name}.`), { status: 400 });
    if (!['Active','OutOfStock'].includes(product.status) || qty > product.stock) {
      throw Object.assign(new Error(`${product.name} has only ${product.stock} ${product.unit} available.`), { status: 409 });
    }
    const pricing = resolveProductPricing(product, sellerRoleMap[product.sellerId], qty);
    if (!pricing.meetsMinimum) {
      throw Object.assign(new Error(`${product.name} requires a minimum order of ${pricing.minimumQuantity} ${product.unit}.`), { status: 400 });
    }
    const { pricingType, unitPrice } = pricing;
    prepared.push({
      product,
      qty,
      pricingType,
      unitPrice,
      lineTotal: qty * unitPrice,
      deliveryCharge: productDeliveryCharge(product, qty),
      wholesaleDiscount: productWholesaleDiscount(product, sellerRoleMap[product.sellerId], pricingType, unitPrice, qty),
    });
  }

  const shippingAddress = body.address || body.shippingAddress || body.deliveryAddress;
  const city = body.city || buyer.city || '';
  const deliveryWindow = estimateDeliveryWindow(city, verifiedSellers.map((seller) => seller.city));
  if (!shippingAddress || !(body.phone || body.contactPhone || buyer.phone)) throw Object.assign(new Error('Delivery address and phone are required.'), { status: 400 });
  const sellerMap = Object.fromEntries(verifiedSellers.map((seller) => [seller.id, seller]));
  for (const preparedItem of prepared) {
    const submitted = submittedByProduct.get(preparedItem.product.id) || {};
    const delivery = submitted.delivery || submitted.deliveryDetails || {};
    const itemAddress = String(delivery.address || submitted.deliveryAddress || shippingAddress || '').trim();
    const itemCity = String(delivery.city || submitted.deliveryCity || city || '').trim();
    const itemPhone = String(delivery.contactPhone || delivery.phone || submitted.contactPhone || body.phone || body.contactPhone || buyer.phone || '').trim();
    const buyerNote = String(delivery.note ?? submitted.buyerNote ?? body.deliveryNote ?? body.notes ?? '').trim();
    if (!itemAddress || !itemCity || !itemPhone) {
      throw Object.assign(new Error(`Complete delivery address, city and phone are required for ${preparedItem.product.name}.`), { status: 400 });
    }
    if (itemAddress.length > 1000 || itemCity.length > 100 || itemPhone.length > 40 || buyerNote.length > 1000) {
      throw Object.assign(new Error(`Delivery details for ${preparedItem.product.name} are too long.`), { status: 400 });
    }
    Object.assign(preparedItem, {
      deliveryAddress: itemAddress,
      deliveryCity: itemCity,
      contactPhone: itemPhone,
      buyerNote: buyerNote || null,
      deliveryWindow: estimateDeliveryWindow(itemCity, [sellerMap[preparedItem.product.sellerId]?.city]),
      deliveryCharge: productDeliveryCharge(preparedItem.product, preparedItem.qty, itemCity),
    });
  }

  const chargedSubtotal = prepared.reduce((sum, item) => sum + item.lineTotal, 0);
  const discount = prepared.reduce((sum, item) => sum + item.wholesaleDiscount, 0);
  const subtotal = chargedSubtotal + discount;
  const shippingFee = prepared.reduce((sum, item) => sum + item.deliveryCharge, 0);
  const totalAmount = subtotal + shippingFee - discount;

  const order = await Order.create({
    orderNumber: orderNumber(), checkoutToken: checkoutToken || null, buyerId: buyer.id, buyerRole: buyer.role, buyerName: body.buyerName || buyer.name,
    city, subtotal, shippingFee, discount, totalAmount,
    shippingAddress, contactPhone: body.phone || body.contactPhone || buyer.phone,
    paymentMethod: body.paymentMethod || 'card', deliveryWindow,
    notes: body.notes || body.deliveryNote || null, sourceBidOfferId, inventoryReserved: false
  });

  const createdItems = await OrderItem.bulkCreate(prepared.map(({ product, qty, pricingType, unitPrice, lineTotal, deliveryCharge, deliveryAddress, deliveryCity, contactPhone, buyerNote, deliveryWindow: itemDeliveryWindow }) => ({
    orderId: order.id, productId: product.id, sellerId: product.sellerId, productName: product.name,
    category: product.category, unit: product.unit, quantity: qty, pricingType, unitPrice, lineTotal,
    fulfillmentStatus: 'Placed', deliveryAddress, deliveryCity, contactPhone, buyerNote,
    deliveryWindow: itemDeliveryWindow, deliveryCharge,
    productSnapshot: {
      name: product.name,
      category: product.category,
      retailPrice: product.retailPrice,
      wholesalePrice: product.wholesalePrice,
      sellerRole: sellerRoleMap[product.sellerId],
      imageUrl: product.imageUrl,
      withinCityDeliveryCharge: number(product.withinCityDeliveryCharge),
      deliveryCharge: number(product.deliveryCharge),
      freeDeliveryMinQuantity: product.freeDeliveryMinQuantity,
      appliedDeliveryCharge: deliveryCharge,
    }
  })));

  await OrderStatusEvent.bulkCreate([
    { orderId: order.id, status: 'Placed', description: 'Order placed successfully.', updatedBy: buyer.id },
    ...createdItems.map((item) => ({
      orderId: order.id,
      orderItemId: item.id,
      sellerId: item.sellerId,
      status: 'Placed',
      description: `${item.productName} was added to the order and is awaiting payment.`,
      updatedBy: buyer.id,
    })),
  ]);
  const hydrated = await hydrateOrder(order);

  runInBackground('Order creation notifications failed', async () => {
    await sendOrderCreatedNotifications({ order, buyer, prepared, verifiedSellers });
  });
  return hydrated;
}


async function deductInventoryForPaidOrder(order) {
  if (!order || order.inventoryReserved) return false;

  return await ordersDB.transaction(async (orderTransaction) => {
    const lockedOrder = await Order.findByPk(order.id, {
      transaction: orderTransaction,
      lock: orderTransaction.LOCK.UPDATE,
    });
    if (!lockedOrder || lockedOrder.inventoryReserved) {
      if (lockedOrder) order.set('inventoryReserved', lockedOrder.inventoryReserved);
      return false;
    }

    const items = await OrderItem.findAll({
      where: { orderId: order.id },
      transaction: orderTransaction,
    });
    const quantitiesByProduct = new Map();
    for (const item of items) {
      if (!item.productId) continue;
      quantitiesByProduct.set(
        item.productId,
        (quantitiesByProduct.get(item.productId) || 0) + Math.max(0, Math.floor(number(item.quantity)))
      );
    }

    if (!quantitiesByProduct.size) {
      throw Object.assign(new Error('This order has no inventory items to fulfill.'), { status: 409 });
    }

    await productsDB.transaction(async (productTransaction) => {
      const productIds = [...quantitiesByProduct.keys()];
      const products = await Product.findAll({
        where: { id: { [Op.in]: productIds } },
        transaction: productTransaction,
        lock: productTransaction.LOCK.UPDATE,
      });
      const productMap = new Map(products.map((product) => [product.id, product]));

      for (const [productId, quantity] of quantitiesByProduct) {
        const product = productMap.get(productId);
        if (!product) {
          throw Object.assign(new Error('One or more paid order products no longer exist.'), { status: 409 });
        }
        if (!['Active', 'OutOfStock'].includes(product.status) || quantity < 1 || quantity > product.stock) {
          throw Object.assign(
            new Error(`${product.name} has only ${product.stock} ${product.unit} available for this payment.`),
            { status: 409 }
          );
        }
      }

      for (const [productId, quantity] of quantitiesByProduct) {
        const product = productMap.get(productId);
        const newStock = product.stock - quantity;
        await product.update({
          stock: newStock,
          status: newStock === 0
            ? 'OutOfStock'
            : product.status === 'OutOfStock' ? 'Active' : product.status,
        }, { transaction: productTransaction });
        emitToUser(product.sellerId, 'inventory:changed', { productId, action: 'reserved' });
        emitToRole('Admin', 'inventory:changed', { productId, action: 'reserved' });
        emitMarketplaceUpdate({ productId, action: 'reserved' });
      }
    });

    await lockedOrder.update(
      { inventoryReserved: true, stockRestoredAt: null },
      { transaction: orderTransaction }
    );
    order.set({ inventoryReserved: true, stockRestoredAt: null });
    return true;
  });
}


async function restoreReservedStock(order) {
  if (!order || !order.inventoryReserved || order.stockRestoredAt) return false;
  const items = await OrderItem.findAll({ where: { orderId: order.id } });

  for (const item of items) {
    if (!item.productId) continue;
    const product = await Product.findByPk(item.productId);
    if (!product) continue;
    await product.increment('stock', { by: item.quantity });
    await product.reload();
    if (product.status === 'OutOfStock' && product.stock > 0) {
      await product.update({ status: 'Active' });
    }
    emitToUser(product.sellerId, 'inventory:changed', { productId: product.id, action: 'restored' });
    emitToRole('Admin', 'inventory:changed', { productId: product.id, action: 'restored' });
    emitMarketplaceUpdate({ productId: product.id, action: 'restored' });
  }

  await order.update({ stockRestoredAt: new Date() });
  return true;
}

async function canAccessOrder(user, order) {
  if (user.role === 'Admin' || order.buyerId === user.id) return true;
  const count = await OrderItem.count({ where: { orderId: order.id, sellerId: user.id } });
  return count > 0;
}

async function canManageOrder(user, order) {
  if (user.role === 'Admin') return true;
  if (!['Supplier','Retailer','Wholesaler'].includes(user.role)) return false;
  const count = await OrderItem.count({ where: { orderId: order.id, sellerId: user.id } });
  return count > 0;
}

module.exports = {
  FULFILLMENT_SEQUENCE,
  SAME_CITY_DELIVERY_WINDOW,
  OUT_OF_CITY_DELIVERY_WINDOW,
  estimateDeliveryWindow,
  productWholesaleDiscount,
  nextFulfillmentStatus,
  aggregateFulfillmentStatus,
  storedOrderStatus,
  syncOrderStatusFromItems,
  confirmPaidOrderItems,
  createOrderFromCart,
  hydrateOrder,
  canAccessOrder,
  canManageOrder,
  deductInventoryForPaidOrder,
  restoreReservedStock,
};
