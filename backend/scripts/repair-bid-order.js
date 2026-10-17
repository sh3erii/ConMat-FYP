require('dotenv').config();

const { Order, OrderItem, Payment, Product, Bid, BidOffer } = require('../models');
const databases = require('../config/database');
const { stripe } = require('../services/stripeService');
const { bidProductIssue } = require('../services/bidInventoryService');
const { persistSuccessfulIntent } = require('../controllers/paymentController');

const orderNumber = String(process.argv[2] || '').trim();
const shouldApply = process.argv.includes('--apply');
const normalized = (value) => String(value || '').trim().toLowerCase();

(async () => {
  try {
    if (!orderNumber) throw new Error('Provide an order number.');

    const order = await Order.findOne({ where: { orderNumber } });
    if (!order?.sourceBidOfferId) throw new Error('The requested bid order was not found.');

    const [offer, item, payment] = await Promise.all([
      BidOffer.findByPk(order.sourceBidOfferId),
      OrderItem.findOne({ where: { orderId: order.id } }),
      Payment.findOne({ where: { orderId: order.id } }),
    ]);
    if (!offer || !item) throw new Error('The bid offer or order item is missing.');

    const request = await Bid.findByPk(offer.bidRequestId);
    if (!request) throw new Error('The original bulk request is missing.');

    let product = item.productId ? await Product.findByPk(item.productId) : null;
    if (!product) {
      const sellerProducts = await Product.findAll({ where: { sellerId: offer.supplierId } });
      const eligible = sellerProducts.filter((candidate) => !bidProductIssue(candidate, {
        sellerId: offer.supplierId,
        request,
      }));
      const titleMatches = eligible.filter((candidate) => {
        const productName = normalized(candidate.name);
        const requestTitle = normalized(request.title);
        return productName === requestTitle
          || productName.includes(requestTitle)
          || requestTitle.includes(productName);
      });
      const candidates = titleMatches.length ? titleMatches : eligible;
      if (candidates.length !== 1) {
        throw new Error(`Expected one compatible supplier product but found ${candidates.length}. No data was changed.`);
      }
      [product] = candidates;
    }

    const intent = payment?.stripePaymentIntentId && stripe
      ? await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId)
      : null;
    const plan = {
      orderNumber: order.orderNumber,
      product: product.name,
      productId: product.id,
      stockBefore: Number(product.stock),
      quantity: Number(item.quantity),
      stockAfterSuccessfulPayment: order.inventoryReserved
        ? Number(product.stock)
        : Number(product.stock) - Number(item.quantity),
      bidUnitPrice: Number(item.unitPrice),
      catalogWholesalePrice: Number(product.wholesalePrice),
      stripeStatus: intent?.status || 'not available',
      apply: shouldApply,
    };
    console.log(JSON.stringify(plan, null, 2));
    if (!shouldApply) return;

    await offer.update({ productId: product.id });
    await item.update({
      productId: product.id,
      productName: product.name,
      category: product.category,
      unit: product.unit,
      productSnapshot: {
        ...(item.productSnapshot || {}),
        bulkRequestId: request.id,
        bulkRequestTitle: request.title,
        bidUnitPrice: Number(item.unitPrice),
        catalogRetailPrice: product.retailPrice,
        catalogWholesalePrice: product.wholesalePrice,
        imageUrl: product.imageUrl,
      },
    });

    if (intent?.status === 'succeeded' && order.paymentStatus !== 'Paid') {
      await persistSuccessfulIntent(intent, order);
    }

    await Promise.all([product.reload(), order.reload(), item.reload()]);
    console.log(JSON.stringify({
      repaired: true,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      inventoryDeducted: order.inventoryReserved,
      remainingStock: Number(product.stock),
      linkedProductId: item.productId,
    }, null, 2));
  } catch (error) {
    console.error(`Bid order repair failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    const connections = [...new Set([
      databases.usersDB,
      databases.productsDB,
      databases.ordersDB,
      databases.paymentsDB,
      databases.bidsDB,
    ])];
    await Promise.all(connections.map((connection) => connection.close().catch(() => {})));
  }
})();
