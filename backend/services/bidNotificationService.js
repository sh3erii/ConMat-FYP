// ============================================================
//  services/bidNotificationService.js
//  Owner: Muhammad Nosherwan (076926)
//  Day 4 – Safe bidding notification wrappers
// ============================================================
const {
  sendBidRequestNotification,
  sendBidAcceptedNotification,
  sendGenericNotificationEmail
} = require('./emailService');

const notifyNewBidRequest = async ({ to, supplierName = 'Seller', productName = 'Bulk material', requiredQty }) => {
  if (!to) return { skipped: true, reason: 'missing-recipient' };
  return sendBidRequestNotification({ to, supplierName, productName, requiredQty });
};

const notifyBidAccepted = async ({ to, supplierName = 'Seller', orderId, bidAmount }) => {
  if (!to) return { skipped: true, reason: 'missing-recipient' };
  return sendBidAcceptedNotification({ to, supplierName, orderId, bidAmount });
};

const notifyBidStatus = async ({ to, title, message }) => {
  if (!to) return { skipped: true, reason: 'missing-recipient' };
  return sendGenericNotificationEmail({ to, title, message });
};

module.exports = {
  notifyNewBidRequest,
  notifyBidAccepted,
  notifyBidStatus
};
