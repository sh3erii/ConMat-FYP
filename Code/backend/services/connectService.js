const User = require('../models/User');
const { requireStripe } = require('./stripeService');

const SELLER_ROLES = new Set(['Supplier', 'Wholesaler', 'Retailer']);

function assertPayoutSeller(user) {
  if (!user || !SELLER_ROLES.has(user.role)) {
    throw Object.assign(new Error('Only seller accounts can configure payouts.'), { status: 403 });
  }
}

function payoutState(account) {
  const transfersStatus = account?.capabilities?.transfers || 'inactive';
  const detailsSubmitted = Boolean(account?.details_submitted);
  const payoutsEnabled = Boolean(account?.payouts_enabled);
  return {
    connected: Boolean(account?.id),
    ready: transfersStatus === 'active' && payoutsEnabled,
    detailsSubmitted,
    payoutsEnabled,
    transfersStatus,
    country: account?.country || null,
    requirementsDue: account?.requirements?.currently_due || [],
    disabledReason: account?.requirements?.disabled_reason || null,
  };
}

async function savePayoutState(user, account) {
  const state = payoutState(account);
  await user.update({
    stripeConnectedAccountId: account.id,
    stripeDetailsSubmitted: state.detailsSubmitted,
    stripePayoutsEnabled: state.payoutsEnabled,
    stripeTransfersStatus: state.transfersStatus,
    stripePayoutCountry: state.country,
  });
  return state;
}

async function retrieveAndSyncPayoutAccount(user) {
  assertPayoutSeller(user);
  if (!user.stripeConnectedAccountId) {
    return {
      connected: false,
      ready: false,
      detailsSubmitted: false,
      payoutsEnabled: false,
      transfersStatus: 'inactive',
      country: null,
      requirementsDue: [],
      disabledReason: null,
    };
  }
  const stripe = requireStripe();
  const account = await stripe.accounts.retrieve(user.stripeConnectedAccountId);
  return { ...(await savePayoutState(user, account)), accountId: account.id };
}

async function createPayoutAccount(user) {
  assertPayoutSeller(user);
  if (user.stripeConnectedAccountId) return user.stripeConnectedAccountId;

  const stripe = requireStripe();
  const country = String(process.env.STRIPE_CONNECT_COUNTRY || 'PK').trim().toUpperCase();
  const account = await stripe.accounts.create({
    country,
    email: user.email,
    business_profile: {
      name: user.companyName || user.name,
      product_description: 'Construction materials sold through the ConMat marketplace',
    },
    capabilities: { transfers: { requested: true } },
    controller: {
      fees: { payer: 'application' },
      losses: { payments: 'application' },
      requirement_collection: 'stripe',
      stripe_dashboard: { type: 'express' },
    },
    metadata: { conmatUserId: String(user.id), role: String(user.role) },
  }, { idempotencyKey: `conmat-connect-account-${user.id}` });

  await savePayoutState(user, account);
  return account.id;
}

async function createOnboardingLink(user) {
  assertPayoutSeller(user);
  const stripe = requireStripe();
  const accountId = await createPayoutAccount(user);
  const frontendUrl = String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  return await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${frontendUrl}/account/settings?stripe=refresh`,
    return_url: `${frontendUrl}/account/settings?stripe=return`,
    type: 'account_onboarding',
    collection_options: { fields: 'eventually_due' },
  });
}

async function createDashboardLink(user) {
  assertPayoutSeller(user);
  if (!user.stripeConnectedAccountId) {
    throw Object.assign(new Error('Complete payout onboarding before opening the Stripe dashboard.'), { status: 409 });
  }
  return await requireStripe().accounts.createLoginLink(user.stripeConnectedAccountId);
}

async function syncPayoutAccountFromWebhook(account) {
  if (!account?.id) return null;
  const user = await User.findOne({ where: { stripeConnectedAccountId: account.id } });
  return user ? await savePayoutState(user, account) : null;
}

module.exports = {
  assertPayoutSeller,
  payoutState,
  retrieveAndSyncPayoutAccount,
  createOnboardingLink,
  createDashboardLink,
  syncPayoutAccountFromWebhook,
};
