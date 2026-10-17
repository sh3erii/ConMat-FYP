const User = require('../models/User');
const {
  assertPayoutSeller,
  retrieveAndSyncPayoutAccount,
  createOnboardingLink,
  createDashboardLink,
} = require('../services/connectService');
const { stripe } = require('../services/stripeService');

async function currentSeller(req) {
  assertPayoutSeller(req.user);
  const user = await User.findByPk(req.user.id);
  if (!user) throw Object.assign(new Error('Seller account not found.'), { status: 404 });
  return user;
}

exports.status = async (req, res, next) => {
  try {
    const user = await currentSeller(req);
    if (!stripe) {
      return res.json({ success: true, data: { configured: false, connected: false, ready: false } });
    }
    const state = await retrieveAndSyncPayoutAccount(user);
    res.json({ success: true, data: { configured: true, ...state } });
  } catch (error) { next(error); }
};

exports.onboardingLink = async (req, res, next) => {
  try {
    const user = await currentSeller(req);
    const link = await createOnboardingLink(user);
    res.json({ success: true, data: { url: link.url, expiresAt: link.expires_at } });
  } catch (error) { next(error); }
};

exports.dashboardLink = async (req, res, next) => {
  try {
    const user = await currentSeller(req);
    const link = await createDashboardLink(user);
    res.json({ success: true, data: { url: link.url } });
  } catch (error) { next(error); }
};
