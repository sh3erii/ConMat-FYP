const finalDemoSmokeService = require('../services/finalDemoSmokeService');

function smoke(req, res) {
  const result = finalDemoSmokeService.getSmokeResult();
  res.status(result.ok ? 200 : 500).json(result);
}

function paymentBiddingNotificationCheck(req, res) {
  res.status(200).json(finalDemoSmokeService.getPaymentBidNotificationCheck());
}

function vivaFlow(req, res) {
  res.status(200).json(finalDemoSmokeService.getVivaFlow());
}

module.exports = {
  smoke,
  paymentBiddingNotificationCheck,
  vivaFlow,
};
