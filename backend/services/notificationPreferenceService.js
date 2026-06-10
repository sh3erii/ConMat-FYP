const NotificationPreference = require('../models/NotificationPreference');

const DEFAULT_PREFERENCES = {
  orderUpdates: true,
  bidUpdates: true,
  paymentInvoices: true,
  adminAlerts: true,
  emailEnabled: true,
};

async function getOrCreatePreferences(userId) {
  if (!userId) throw new Error('userId is required.');

  const [preferences] = await NotificationPreference.findOrCreate({
    where: { userId },
    defaults: { userId, ...DEFAULT_PREFERENCES },
  });

  return preferences;
}

async function updatePreferences(userId, payload) {
  const preferences = await getOrCreatePreferences(userId);

  const allowedKeys = Object.keys(DEFAULT_PREFERENCES);
  allowedKeys.forEach((key) => {
    if (typeof payload[key] === 'boolean') preferences[key] = payload[key];
  });

  await preferences.save();
  return preferences;
}

module.exports = {
  DEFAULT_PREFERENCES,
  getOrCreatePreferences,
  updatePreferences,
};
