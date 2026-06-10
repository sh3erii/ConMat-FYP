const Stripe = require('stripe');

function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  return Stripe(process.env.STRIPE_SECRET_KEY);
}

function toStripeAmount(amount) {
  return Math.round(Number(amount || 0) * 100);
}

async function createPaymentIntent({ orderId, orderNumber, amount, currency = 'pkr', buyerEmail }) {
  if (!orderId && !orderNumber) {
    throw new Error('orderId or orderNumber is required.');
  }

  if (!amount || Number(amount) <= 0) {
    throw new Error('Valid payment amount is required.');
  }

  const stripe = getStripeClient();

  if (!stripe) {
    return {
      demoMode: true,
      clientSecret: 'demo_client_secret_configure_STRIPE_SECRET_KEY',
      paymentIntentId: `pi_demo_${Date.now()}`,
      amount,
      currency,
      orderId,
      orderNumber,
      message: 'STRIPE_SECRET_KEY is not configured. Demo response returned.',
    };
  }

  const intent = await stripe.paymentIntents.create({
    amount: toStripeAmount(amount),
    currency,
    receipt_email: buyerEmail || undefined,
    automatic_payment_methods: { enabled: true },
    metadata: {
      orderId: orderId || '',
      orderNumber: orderNumber || '',
    },
  });

  return {
    demoMode: false,
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    amount,
    currency,
    orderId,
    orderNumber,
  };
}

async function confirmDemoPayment({ orderId, orderNumber, amount, method }) {
  return {
    orderId,
    orderNumber,
    amount,
    method: method || 'Demo Card',
    paymentStatus: 'Paid',
    paymentReference: `DEMO-PAY-${Date.now()}`,
    invoiceId: `INV-${orderNumber || orderId || Date.now()}`,
  };
}

module.exports = {
  createPaymentIntent,
  confirmDemoPayment,
};
