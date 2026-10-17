const Stripe = require('stripe');

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      maxNetworkRetries: 2,
      timeout: Number(process.env.STRIPE_API_TIMEOUT_MS || 30000),
    })
  : null;

function requireStripe() {
  if (!stripe) {
    throw Object.assign(new Error('Stripe is not configured on the backend.'), { status: 503 });
  }
  return stripe;
}

module.exports = { stripe, requireStripe };
