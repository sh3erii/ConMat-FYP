// ============================================================
//  controllers/paymentController.js  (Muhammad Nosherwan – 076926)
//  Day 2 – Stripe PaymentIntent + invoice generation APIs
// ============================================================
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const { createPaymentIntent, confirmPaymentIntent } = require('../services/stripeService');
const { createInvoiceForPayment } = require('../services/invoiceService');

const toPaisas = (amount) => Math.round(Number(amount) * 100);

const createIntent = async (req, res) => {
  try {
    const { orderId, amount, currency = 'pkr' } = req.body;

    if (!orderId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'orderId and valid amount are required.' });
    }

    const paymentIntent = await createPaymentIntent({
      amount: toPaisas(amount),
      currency,
      metadata: {
        orderId,
        buyerId: req.user.id,
        source: 'ConMat'
      }
    });

    const payment = await Payment.create({
      orderId,
      buyerId: req.user.id,
      amount,
      currency,
      method: 'card',
      status: 'pending',
      stripePaymentIntentId: paymentIntent.id
    });

    return res.status(201).json({
      success: true,
      message: 'Payment intent created successfully.',
      clientSecret: paymentIntent.client_secret,
      payment
    });
  } catch (error) {
    console.error('Create Payment Intent Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while creating payment intent.' });
  }
};

const confirmPayment = async (req, res) => {
  try {
    const { paymentId, stripePaymentIntentId } = req.body;

    if (!paymentId && !stripePaymentIntentId) {
      return res.status(400).json({ success: false, message: 'paymentId or stripePaymentIntentId is required.' });
    }

    const where = paymentId ? { id: paymentId } : { stripePaymentIntentId };
    const payment = await Payment.findOne({ where });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found.' });

    if (payment.buyerId !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'You can confirm only your own payment.' });
    }

    const intent = await confirmPaymentIntent(payment.stripePaymentIntentId || stripePaymentIntentId);
    const success = intent.status === 'succeeded';

    await payment.update({
      status: success ? 'success' : 'failed',
      transactionId: intent.latest_charge || intent.id,
      paidAt: success ? new Date() : null
    });

    let invoice = null;
    if (success) {
      invoice = await createInvoiceForPayment({
        orderId: payment.orderId,
        paymentId: payment.id,
        buyerId: payment.buyerId,
        amount: payment.amount,
        currency: payment.currency
      });

      await payment.update({ invoicePdfUrl: invoice.pdfUrl });

      const order = await Order.findByPk(payment.orderId).catch(() => null);
      if (order) await order.update({ status: 'Paid', paymentId: payment.id });
    }

    return res.status(200).json({
      success,
      message: success ? 'Payment confirmed and invoice generated.' : 'Payment was not successful.',
      payment,
      invoice
    });
  } catch (error) {
    console.error('Confirm Payment Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while confirming payment.' });
  }
};

const getMyPayments = async (req, res) => {
  try {
    const where = req.user.role === 'Admin' ? {} : { buyerId: req.user.id };
    const payments = await Payment.findAll({ where, order: [['createdAt', 'DESC']] });
    return res.status(200).json({ success: true, count: payments.length, payments });
  } catch (error) {
    console.error('Get Payments Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching payments.' });
  }
};

const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });

    if (payment.buyerId !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Access denied for this payment.' });
    }

    return res.status(200).json({ success: true, payment });
  } catch (error) {
    console.error('Get Payment Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching payment.' });
  }
};

module.exports = {
  createIntent,
  confirmPayment,
  getMyPayments,
  getPaymentById
};
