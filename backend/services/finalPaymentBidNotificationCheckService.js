function getPaymentBiddingNotificationChecklist() {
  return {
    owner: 'Muhammad Nosherwan',
    day: 15,
    checks: [
      {
        module: 'Payment',
        ready: true,
        items: ['create Stripe payment intent', 'confirm demo payment', 'payment status log', 'receipt preparation'],
      },
      {
        module: 'Invoice',
        ready: true,
        items: ['invoice number generation', 'invoice lookup', 'printable invoice HTML', 'email invoice endpoint preparation'],
      },
      {
        module: 'Bidding',
        ready: true,
        items: ['bulk request', 'seller offer', 'bid comparison', 'accepted bid to order conversion'],
      },
      {
        module: 'Notifications',
        ready: true,
        items: ['notification preferences', 'delivery service', 'email templates', 'automation rules'],
      },
      {
        module: 'Admin Reports',
        ready: true,
        items: ['analytics snapshots', 'report charts', 'CSV export cleanup', 'final QA issue log'],
      },
    ],
  };
}

function getFailedChecks() {
  return getPaymentBiddingNotificationChecklist().checks.filter((check) => !check.ready);
}

module.exports = {
  getPaymentBiddingNotificationChecklist,
  getFailedChecks,
};
