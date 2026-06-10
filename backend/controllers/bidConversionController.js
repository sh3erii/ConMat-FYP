// ============================================================
//  controllers/bidConversionController.js  (Muhammad Nosherwan – 076926)
//  Day 6 – Bid analytics and accepted-bid-to-order conversion
// ============================================================
const { Op } = require('sequelize');
const { Bid, BidOffer } = require('../models/Bid');
const { buildOfferDecisionMatrix, buildBidAnalyticsSummary } = require('../services/bidAnalyticsService');
const { createOrderFromAcceptedBid } = require('../services/acceptedBidOrderService');

const buyerRoles = ['Wholesaler', 'Retailer', 'Admin'];

const getAuthUserId = (req) => req.user?.id || req.user?.userId || null;

const getBidAnalyticsSummary = async (req, res) => {
  try {
    const where = req.user.role === 'Admin' ? {} : { requestedById: getAuthUserId(req) };
    const bidRequests = await Bid.findAll({
      where,
      include: [{ model: BidOffer, as: 'offers' }],
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({ success: true, summary: buildBidAnalyticsSummary(bidRequests), bidRequests });
  } catch (error) {
    console.error('Bid Analytics Summary Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while building bid analytics summary.' });
  }
};

const getBidDecisionMatrix = async (req, res) => {
  try {
    const bidRequest = await Bid.findByPk(req.params.requestId, {
      include: [{ model: BidOffer, as: 'offers' }]
    });

    if (!bidRequest) return res.status(404).json({ success: false, message: 'Bid request not found.' });

    if (req.user.role !== 'Admin' && String(bidRequest.requestedById) !== String(getAuthUserId(req))) {
      return res.status(403).json({ success: false, message: 'Only request owner or admin can view decision matrix.' });
    }

    const result = buildOfferDecisionMatrix(bidRequest, bidRequest.offers || []);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Bid Decision Matrix Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while building bid decision matrix.' });
  }
};

const convertAcceptedBidToOrder = async (req, res) => {
  try {
    if (!buyerRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only wholesalers, retailers and admins can convert accepted bids to orders.' });
    }

    const offer = await BidOffer.findByPk(req.params.offerId);
    if (!offer || ['Cancelled', 'Rejected'].includes(offer.status)) {
      return res.status(404).json({ success: false, message: 'Convertible bid offer not found.' });
    }

    const bidRequest = await Bid.findByPk(offer.bidRequestId);
    if (!bidRequest) return res.status(404).json({ success: false, message: 'Bid request not found.' });

    if (req.user.role !== 'Admin' && String(bidRequest.requestedById) !== String(getAuthUserId(req))) {
      return res.status(403).json({ success: false, message: 'Only request owner or admin can convert this bid into order.' });
    }

    if (bidRequest.acceptedOfferId && String(bidRequest.acceptedOfferId) !== String(offer.id)) {
      return res.status(400).json({ success: false, message: 'Another offer has already been accepted for this request.' });
    }

    if (offer.status !== 'Accepted') {
      await offer.update({ status: 'Accepted' });
      await BidOffer.update(
        { status: 'Rejected' },
        { where: { bidRequestId: offer.bidRequestId, id: { [Op.ne]: offer.id }, status: 'Submitted' } }
      );
    }

    await bidRequest.update({ requestStatus: 'Closed', acceptedOfferId: offer.id });

    const order = await createOrderFromAcceptedBid({
      bidRequest,
      offer,
      buyer: {
        id: getAuthUserId(req),
        role: req.user.role,
        phone: req.body.contactPhone
      },
      shippingAddress: req.body.shippingAddress,
      contactPhone: req.body.contactPhone,
      notes: req.body.notes
    });

    return res.status(201).json({
      success: true,
      message: 'Accepted bid converted into order successfully.',
      bidRequest,
      acceptedOffer: offer,
      order
    });
  } catch (error) {
    console.error('Convert Accepted Bid Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while converting bid into order.', error: error.message });
  }
};

module.exports = {
  getBidAnalyticsSummary,
  getBidDecisionMatrix,
  convertAcceptedBidToOrder
};
