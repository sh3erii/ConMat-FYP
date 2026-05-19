// ============================================================
//  services/stripeService.js  (Muhammad Nosherwan – 076926)
//  Initialises Stripe SDK and exports helper functions
// ============================================================
require('dotenv').config();
const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// ── Create a PaymentIntent ───────────────────────────────────
//  amount: number in smallest currency unit (e.g. paisas for PKR)
//  For PKR: multiply rupees × 100
const createPaymentIntent = async ({ amount, currency = 'pkr', metadata = {} }) => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    metadata,
    automatic_payment_methods: { enabled: true }
  });
  return paymentIntent;
};

// ── Confirm a PaymentIntent ──────────────────────────────────
const confirmPaymentIntent = async (paymentIntentId) => {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  return paymentIntent;
};

// ── Construct Webhook Event (for Stripe webhooks) ────────────
const constructWebhookEvent = (payload, signature) => {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
};

module.exports = {
  stripe,
  createPaymentIntent,
  confirmPaymentIntent,
  constructWebhookEvent
};
