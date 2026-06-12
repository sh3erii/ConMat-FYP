const {
  getPaymentBiddingNotificationChecklist,
  getFailedChecks,
} = require('./finalPaymentBidNotificationCheckService');

function getSmokeResult() {
  const failed = getFailedChecks();

  return {
    ok: failed.length === 0,
    project: 'ConMat',
    day: 15,
    owner: 'Muhammad Nosherwan',
    message: failed.length === 0 ? 'Final demo smoke checks are ready.' : 'Some final smoke checks need review.',
    failed,
    timestamp: new Date().toISOString(),
  };
}

function getVivaFlow() {
  return {
    title: 'ConMat Final Viva Flow',
    steps: [
      'Landing page and project purpose',
      'Register/login and role based dashboards',
      'Marketplace product browsing and filters',
      'Supplier product/inventory management',
      'Cart, checkout, payment and invoice',
      'Bulk order bidding and bid comparison',
      'Admin seller verification and management',
      'Analytics, reports and notifications',
      'Final technology stack explanation',
    ],
  };
}

function getPaymentBidNotificationCheck() {
  return getPaymentBiddingNotificationChecklist();
}

module.exports = {
  getSmokeResult,
  getVivaFlow,
  getPaymentBidNotificationCheck,
};
