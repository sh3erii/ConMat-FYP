const { Order, Payment, Invoice, User } = require('../models');
const { notifySafely, notifyActiveAdminsSafely } = require('../services/notificationService');
const { number } = require('../services/formatters');
const { stripe } = require('../services/stripeService');
const { ensurePayoutLedger } = require('../services/payoutService');
const { syncPayoutAccountFromWebhook } = require('../services/connectService');
const { runSafely } = require('../services/asyncService');
const { deductInventoryForPaidOrder, confirmPaidOrderItems } = require('../services/orderService');

const invoiceNumber = () => `CM-INV-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`;
const transferGroup = (order) => `CONMAT_ORDER_${order.id}`;

async function invoiceFor(order, payment) {
  const [invoice] = await Invoice.findOrCreate({
    where: { orderId: order.id },
    defaults: {
      invoiceNumber: invoiceNumber(),
      orderId: order.id,
      buyerId: order.buyerId,
      paymentId: payment?.id || null,
      subtotal: order.subtotal,
      deliveryFee: order.shippingFee,
      discount: order.discount,
      total: order.totalAmount,
      status: 'Paid',
      paidAt: payment?.paidAt || new Date(),
    },
  });

  if (invoice.status !== 'Paid') {
    await invoice.update({
      status: 'Paid',
      paidAt: payment?.paidAt || new Date(),
      paymentId: payment?.id || invoice.paymentId,
    });
  }

  return invoice;
}

async function persistSuccessfulIntent(intent, expectedOrder = null) {
  const orderId = intent.metadata?.orderId || expectedOrder?.id;
  const order = expectedOrder || (orderId ? await Order.findByPk(orderId) : null);
  if (!order) throw Object.assign(new Error('Order for this payment could not be found.'), { status: 404 });
  if (intent.status !== 'succeeded') throw Object.assign(new Error('Stripe has not confirmed this payment yet.'), { status: 409 });
  if (intent.metadata?.orderId && String(intent.metadata.orderId) !== String(order.id)) throw Object.assign(new Error('Payment/order reference mismatch.'), { status: 409 });
  const expectedAmount = Math.round(number(order.totalAmount) * 100);
  if (intent.currency !== 'pkr' || Number(intent.amount_received ?? intent.amount) !== expectedAmount) {
    throw Object.assign(new Error('Stripe payment amount or currency does not match this order.'), { status: 409 });
  }

  const paidAt = new Date();
  const chargeId = typeof intent.latest_charge === 'string' ? intent.latest_charge : intent.latest_charge?.id || null;
  let payment = await Payment.findOne({ where: { orderId: order.id } });
  const firstSuccessfulPersistence = order.paymentStatus !== 'Paid' || !payment || payment.status !== 'Paid';
  const nextFundsStatus = payment && payment.fundsStatus !== 'NotFunded' ? payment.fundsStatus : 'Held';
  const values = {
    buyerId: order.buyerId,
    amount: order.totalAmount,
    method: 'card',
    status: 'Paid',
    stripePaymentIntentId: intent.id,
    stripeChargeId: chargeId,
    transactionId: chargeId || intent.id,
    fundsStatus: nextFundsStatus,
    paidAt,
  };

  await deductInventoryForPaidOrder(order);

  if (!payment) payment = await Payment.create({ orderId: order.id, ...values });
  else await payment.update(values);

  await order.update({
    paymentStatus: 'Paid',
    status: 'Paid',
    paymentId: payment.id,
    paymentMethod: 'Stripe Card Payment',
    orderStatus: order.orderStatus === 'Placed' ? 'Confirmed' : order.orderStatus,
  });
  await confirmPaidOrderItems(order, order.buyerId);

  const invoice = await invoiceFor(order, payment);
  const payoutEntries = await runSafely('Seller payout ledger creation skipped', async () => (
    await ensurePayoutLedger(order, payment)
  ));
  if (firstSuccessfulPersistence) {
    const buyer = await User.findByPk(order.buyerId);
    const paymentAmount = `PKR ${number(order.totalAmount).toLocaleString('en-PK')}`;
    await Promise.all([
      notifySafely({
        userId: order.buyerId,
        email: buyer?.email,
        title: 'Payment successful',
        message: `Your payment of ${paymentAmount} for order ID ${order.orderNumber} was successful. Invoice ${invoice.invoiceNumber} is ready.`,
        type: 'Payment',
        actionUrl: `/invoices/${invoice.id}`,
        metadata: { event: 'buyer-payment-confirmed', orderId: order.id, orderNumber: order.orderNumber, paymentId: payment.id, invoiceId: invoice.id },
        emailDetails: {
          'Order ID': order.orderNumber,
          'Payment amount': paymentAmount,
          Method: 'Stripe card',
          Status: 'Paid',
          Invoice: invoice.invoiceNumber,
        },
      }, 'Customer payment notification skipped'),
      notifyActiveAdminsSafely({
        title: 'Payment received',
        message: `Payment of ${paymentAmount} was received from ${buyer?.name || order.buyerName || 'a customer'} for order ID ${order.orderNumber}.`,
        type: 'Payment',
        actionUrl: '/admin/orders',
        metadata: { event: 'admin-payment-received', orderId: order.id, orderNumber: order.orderNumber, buyerId: order.buyerId, paymentId: payment.id, invoiceId: invoice.id },
        emailDetails: {
          'Order ID': order.orderNumber,
          Customer: buyer?.name || order.buyerName || 'ConMat customer',
          'Customer email': buyer?.email || 'Not available',
          'Payment amount': paymentAmount,
          Method: 'Stripe card',
          Status: 'Paid',
          'Payment reference': payment.transactionId || intent.id,
          Invoice: invoice.invoiceNumber,
        },
      }, 'Admin payment notifications skipped'),
    ]);

    if (payoutEntries) {
      await Promise.all(payoutEntries.map(async ({ payout, seller }) => await notifySafely({
        userId: seller.id,
        email: seller.email,
        title: 'Buyer payment confirmed',
        message: `Payment for order ID ${order.orderNumber} succeeded. Your proceeds are secured by ConMat and will be released when the buyer confirms receipt, or automatically after 24 hours unless the buyer pauses release through WhatsApp support.`,
        type: 'Payment',
        actionUrl: '/supplier/incoming-orders',
        metadata: { event: 'seller-order-payment-confirmed', orderId: order.id, paymentId: payment.id, payoutId: payout.id },
        emailDetails: {
          'Order ID': order.orderNumber,
          'Seller gross': `PKR ${number(payout.grossAmount).toLocaleString('en-PK')}`,
          'ConMat commission (1%)': `PKR ${number(payout.commissionAmount).toLocaleString('en-PK')}`,
          'Net seller proceeds': `PKR ${number(payout.netAmount).toLocaleString('en-PK')}`,
          'Payout method': payout.payoutDestination,
          Status: 'Held until receipt confirmation or the 24-hour deadline',
        },
      }, 'Seller payment confirmation notification skipped')));
    }
  }

  return { order, payment, invoice };
}

exports.persistSuccessfulIntent = persistSuccessfulIntent;

exports.createIntent = async (req, res, next) => {
  try {
    if (!stripe) return res.status(503).json({ success: false, message: 'Stripe is not configured on the backend.' });

    const order = await Order.findByPk(req.body.orderId);
    if (!order || order.buyerId !== req.user.id) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (order.orderStatus === 'Cancelled' || order.status === 'Cancelled') {
      return res.status(409).json({ success: false, message: 'A cancelled order cannot be paid.' });
    }
    if (order.paymentStatus === 'Paid') {
      const invoice = await Invoice.findOne({ where: { orderId: order.id } });
      return res.json({
        success: true,
        data: {
          alreadyPaid: true,
          orderId: order.id,
          invoiceId: invoice?.id || null,
          invoiceNumber: invoice?.invoiceNumber || null,
          amount: number(order.totalAmount),
          currency: 'pkr',
        },
      });
    }

    let payment = await Payment.findOne({ where: { orderId: order.id } });
    if (!payment) {
      payment = await Payment.create({
        orderId: order.id,
        buyerId: order.buyerId,
        amount: order.totalAmount,
        method: 'card',
        status: 'Pending',
      });
    }

    let intent;
    let priorIntentId = payment.stripePaymentIntentId || 'initial';
    if (payment.stripePaymentIntentId) {
      intent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
      if (intent.status === 'succeeded') {
        const { invoice } = await persistSuccessfulIntent(intent, order);
        return res.json({
          success: true,
          data: {
            alreadyPaid: true,
            orderId: order.id,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            paymentIntentId: intent.id,
            amount: number(order.totalAmount),
            currency: intent.currency,
          },
        });
      }
      if (intent.status === 'canceled') {
        priorIntentId = intent.id;
        intent = null;
      }
    }

    if (!intent) {
      intent = await stripe.paymentIntents.create({
        amount: Math.round(number(order.totalAmount) * 100),
        currency: 'pkr',
        automatic_payment_methods: { enabled: true },
        transfer_group: transferGroup(order),
        metadata: { orderId: String(order.id), buyerId: String(order.buyerId) },
      }, { idempotencyKey: `conmat-payment-intent-${order.id}-${priorIntentId}` });
      await payment.update({ stripePaymentIntentId: intent.id });
    }

    res.json({
      success: true,
      data: {
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        amount: number(order.totalAmount),
        currency: intent.currency,
      },
    });
  } catch (e) { next(e); }
};

exports.confirmIntent = async (req, res, next) => {
  try {
    if (!stripe) return res.status(503).json({ success: false, message: 'Stripe is not configured on the backend.' });

    const { orderId, paymentIntentId } = req.body;
    if (!orderId || !paymentIntentId) return res.status(400).json({ success: false, message: 'orderId and paymentIntentId are required.' });

    const order = await Order.findByPk(orderId);
    if (!order || order.buyerId !== req.user.id) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (order.orderStatus === 'Cancelled' || order.status === 'Cancelled') {
      return res.status(409).json({ success: false, message: 'A cancelled order cannot be paid.' });
    }

    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.metadata?.buyerId && String(intent.metadata.buyerId) !== String(req.user.id)) return res.status(403).json({ success: false, message: 'Payment does not belong to this account.' });

    const { invoice } = await persistSuccessfulIntent(intent, order);
    res.json({
      success: true,
      data: {
        orderId: order.id,
        paymentStatus: 'Paid',
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        paymentIntentId: intent.id,
      },
    });
  } catch (e) { next(e); }
};

exports.webhook = async (req, res, next) => {
  try {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).json({ success: false, message: 'Stripe webhook is not configured.' });

    const signature = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === 'payment_intent.succeeded') await persistSuccessfulIntent(event.data.object);
    if (event.type === 'account.updated') await syncPayoutAccountFromWebhook(event.data.object);

    res.json({ received: true });
  } catch (e) { next(e); }
};
