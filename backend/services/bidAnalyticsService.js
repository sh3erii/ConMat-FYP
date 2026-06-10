// ============================================================
//  services/bidAnalyticsService.js  (Muhammad Nosherwan – 076926)
//  Day 6 – Bid analytics and decision matrix helpers
// ============================================================
const toMoney = (value) => Number(Number(value || 0).toFixed(2));

const normalizeOffer = (offer) => (typeof offer.toJSON === 'function' ? offer.toJSON() : offer);
const normalizeRequest = (request) => (typeof request.toJSON === 'function' ? request.toJSON() : request);

const calculateOfferScore = ({ offer, request, bestAmount, fastestDays }) => {
  const bidAmount = Number(offer.bidAmount || 0);
  const deliveryDays = Number(offer.deliveryDays || 1);
  const targetPrice = Number(request.targetPrice || bidAmount || 1);

  const priceScore = bestAmount > 0 ? Math.min(55, (bestAmount / bidAmount) * 55) : 35;
  const deliveryScore = fastestDays > 0 ? Math.min(25, (fastestDays / deliveryDays) * 25) : 15;
  const targetScore = bidAmount <= targetPrice ? 15 : Math.max(0, 15 - ((bidAmount - targetPrice) / targetPrice) * 15);
  const reliabilityScore = offer.status === 'Accepted' ? 5 : 3;

  return Math.round(priceScore + deliveryScore + targetScore + reliabilityScore);
};

const buildOfferDecisionMatrix = (bidRequest, offerRows = []) => {
  const request = normalizeRequest(bidRequest);
  const offers = offerRows.map(normalizeOffer);
  const bestAmount = offers.length ? Math.min(...offers.map((offer) => Number(offer.bidAmount || 0))) : 0;
  const fastestDays = offers.length ? Math.min(...offers.map((offer) => Number(offer.deliveryDays || 1))) : 0;

  const matrix = offers.map((offer) => {
    const score = calculateOfferScore({ offer, request, bestAmount, fastestDays });
    const totalAmount = toMoney(Number(offer.bidAmount || 0) * Number(request.requiredQuantity || 1));
    const targetTotal = toMoney(Number(request.targetPrice || 0) * Number(request.requiredQuantity || 1));
    const savingAgainstTarget = toMoney(targetTotal - totalAmount);

    return {
      offerId: offer.id,
      supplierId: offer.supplierId,
      bidAmount: toMoney(offer.bidAmount),
      deliveryDays: offer.deliveryDays,
      status: offer.status,
      score,
      totalAmount,
      savingAgainstTarget,
      tags: [
        Number(offer.bidAmount) === bestAmount ? 'Best Price' : null,
        Number(offer.deliveryDays) === fastestDays ? 'Fastest Delivery' : null,
        Number(offer.bidAmount) <= Number(request.targetPrice || Infinity) ? 'Within Target' : null
      ].filter(Boolean),
      notes: offer.notes
    };
  });

  matrix.sort((a, b) => b.score - a.score || a.bidAmount - b.bidAmount || a.deliveryDays - b.deliveryDays);

  return {
    request,
    summary: {
      totalOffers: offers.length,
      bestAmount: toMoney(bestAmount),
      fastestDays,
      targetPrice: toMoney(request.targetPrice),
      recommendedOfferId: matrix[0]?.offerId || null
    },
    matrix
  };
};

const buildBidAnalyticsSummary = (requests = []) => {
  const normalized = requests.map(normalizeRequest);
  const totalRequests = normalized.length;
  const openRequests = normalized.filter((request) => request.requestStatus === 'Open').length;
  const closedRequests = normalized.filter((request) => request.requestStatus === 'Closed').length;
  const totalOffers = normalized.reduce((sum, request) => sum + Number(request.offers?.length || 0), 0);
  const acceptedOffers = normalized.reduce((sum, request) => {
    return sum + Number((request.offers || []).filter((offer) => offer.status === 'Accepted').length);
  }, 0);

  return {
    totalRequests,
    openRequests,
    closedRequests,
    totalOffers,
    acceptedOffers,
    averageOffersPerRequest: totalRequests ? toMoney(totalOffers / totalRequests) : 0,
    conversionRate: totalOffers ? toMoney((acceptedOffers / totalOffers) * 100) : 0
  };
};

module.exports = {
  buildOfferDecisionMatrix,
  buildBidAnalyticsSummary,
  calculateOfferScore
};
