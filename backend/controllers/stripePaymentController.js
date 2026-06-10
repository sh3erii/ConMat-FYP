const stripeCheckoutService = require('../services/stripeCheckoutService');
const stripeWebhookService = require('../services/stripeWebhookService');
const paymentReceiptService = require('../services/paymentReceiptService');

async function createPaymentIntent(req, res) {
  try {
    const intent = await stripeCheckoutService.createPaymentIntent({
      orderId: req.body.orderId,
      orderNumber: req.body.orderNumber,
      amount: req.body.amount,
      currency: req.body.currency || 'pkr',
      buyerEmail: req.body.buyerEmail || req.user?.email,
    });

    return res.status(201).json({
      success: true,
      message: 'Payment intent prepared successfully.',
      data: intent,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function confirmDemoPayment(req, res) {
  try {
    const result = await stripeCheckoutService.confirmDemoPayment({
      orderId: req.body.orderId,
      orderNumber: req.body.orderNumber,
      amount: req.body.amount,
      method: req.body.method,
    });

    const receipt = await paymentReceiptService.sendPaymentReceiptEmail({
      to: req.body.buyerEmail || req.user?.email,
      buyerName: req.body.buyerName || req.user?.name,
      orderNumber: result.orderNumber || result.orderId,
      amount: result.amount,
      paymentReference: result.paymentReference,
    });

    return res.status(200).json({
      success: true,
      message: 'Demo payment confirmed successfully.',
      data: { ...result, receipt },
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function handleStripeWebhook(req, res) {
  try {
    const log = await stripeWebhookService.handleWebhook(req);

    return res.status(200).json({
      success: true,
      message: 'Stripe webhook processed successfully.',
      data: log,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  createPaymentIntent,
  confirmDemoPayment,
  handleStripeWebhook,
};
