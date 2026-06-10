const notificationPreferenceService = require('./notificationPreferenceService');
let Notification;
let emailService;

try {
  Notification = require('../models/Notification');
} catch (error) {
  Notification = null;
}

try {
  emailService = require('./emailService');
} catch (error) {
  emailService = null;
}

const CATEGORY_TO_PREF = {
  ORDER: 'orderUpdates',
  BID: 'bidUpdates',
  PAYMENT: 'paymentInvoices',
  INVOICE: 'paymentInvoices',
  ADMIN: 'adminAlerts',
};

async function createInAppNotification(payload) {
  if (!Notification) {
    return { skipped: true, reason: 'Notification model not found yet.', payload };
  }

  return Notification.create({
    userId: payload.userId,
    title: payload.title,
    message: payload.message,
    type: payload.category || payload.type || 'INFO',
    isRead: false,
    actionUrl: payload.actionUrl || null,
  });
}

async function deliverNotification(payload) {
  const preferences = await notificationPreferenceService.getOrCreatePreferences(payload.userId);
  const preferenceKey = CATEGORY_TO_PREF[payload.category] || 'adminAlerts';

  if (!preferences[preferenceKey]) {
    return { delivered: false, reason: `${preferenceKey} disabled by user.` };
  }

  const inApp = await createInAppNotification(payload);

  if (preferences.emailEnabled && payload.email && emailService?.sendEmail) {
    await emailService.sendEmail({
      to: payload.email,
      subject: payload.title,
      html: `<p>${payload.message}</p>`,
    });
  }

  return { delivered: true, inApp };
}

module.exports = {
  deliverNotification,
  createInAppNotification,
};
