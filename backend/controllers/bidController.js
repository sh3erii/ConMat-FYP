// ============================================================
//  controllers/bidController.js  (Muhammad Nosherwan – 076926)
//  Day 2 – Bulk bid request and supplier bid offer APIs
// ============================================================
const { Bid, BidOffer } = require('../models/Bid');
const { sendBidRequestNotification, sendBidAcceptedNotification } = require('../services/emailService');

const createBidRequest = async (req, res) => {
  try {
    const { productId, requiredQuantity, notes } = req.body;

    if (!productId || !requiredQuantity || Number(requiredQuantity) < 1) {
      return res.status(400).json({ success: false, message: 'productId and requiredQuantity are required.' });
    }

    const bidRequest = await Bid.create({
      requestedById: req.user.id,
      productId,
      requiredQuantity,
      notes: notes || null,
      requestStatus: 'Open'
    });

    return res.status(201).json({
      success: true,
      message: 'Bulk order bid request created successfully.',
      bidRequest
    });
  } catch (error) {
    console.error('Create Bid Request Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while creating bid request.' });
  }
};

const getOpenBidRequests = async (req, res) => {
  try {
    const bidRequests = await Bid.findAll({
      where: { requestStatus: 'Open' },
      order: [['createdAt', 'DESC']]
    });
    return res.status(200).json({ success: true, count: bidRequests.length, bidRequests });
  } catch (error) {
    console.error('Get Open Bid Requests Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching bid requests.' });
  }
};

const getMyBidRequests = async (req, res) => {
  try {
    const bidRequests = await Bid.findAll({
      where: { requestedById: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    return res.status(200).json({ success: true, count: bidRequests.length, bidRequests });
  } catch (error) {
    console.error('Get My Bid Requests Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching your bid requests.' });
  }
};

const submitBidOffer = async (req, res) => {
  try {
    const { bidRequestId, bidAmount } = req.body;

    if (!bidRequestId || !bidAmount || Number(bidAmount) <= 0) {
      return res.status(400).json({ success: false, message: 'bidRequestId and valid bidAmount are required.' });
    }

    const bidRequest = await Bid.findByPk(bidRequestId);
    if (!bidRequest || bidRequest.requestStatus !== 'Open') {
      return res.status(404).json({ success: false, message: 'Open bid request not found.' });
    }

    if (bidRequest.requestedById === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot bid on your own request.' });
    }

    const existingOffer = await BidOffer.findOne({
      where: { bidRequestId, supplierId: req.user.id }
    });

    if (existingOffer) {
      await existingOffer.update({ bidAmount, status: 'Submitted' });
      return res.status(200).json({ success: true, message: 'Bid offer updated successfully.', bidOffer: existingOffer });
    }

    const bidOffer = await BidOffer.create({
      bidRequestId,
      supplierId: req.user.id,
      bidAmount,
      status: 'Submitted'
    });

    return res.status(201).json({ success: true, message: 'Bid offer submitted successfully.', bidOffer });
  } catch (error) {
    console.error('Submit Bid Offer Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while submitting bid offer.' });
  }
};

const getOffersForRequest = async (req, res) => {
  try {
    const bidRequest = await Bid.findByPk(req.params.requestId);
    if (!bidRequest) return res.status(404).json({ success: false, message: 'Bid request not found.' });

    if (bidRequest.requestedById !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Only request owner can view all offers.' });
    }

    const offers = await BidOffer.findAll({
      where: { bidRequestId: req.params.requestId },
      order: [['bidAmount', 'ASC']]
    });

    return res.status(200).json({ success: true, count: offers.length, offers });
  } catch (error) {
    console.error('Get Bid Offers Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching bid offers.' });
  }
};

const cancelMyBidOffer = async (req, res) => {
  try {
    const offer = await BidOffer.findByPk(req.params.offerId);
    if (!offer) return res.status(404).json({ success: false, message: 'Bid offer not found.' });

    if (offer.supplierId !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'You can cancel only your own bid offer.' });
    }

    await offer.update({ status: 'Cancelled' });
    return res.status(200).json({ success: true, message: 'Bid offer cancelled successfully.', bidOffer: offer });
  } catch (error) {
    console.error('Cancel Bid Offer Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while cancelling bid offer.' });
  }
};

const acceptBidOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const offer = await BidOffer.findByPk(offerId);
    if (!offer || offer.status !== 'Submitted') {
      return res.status(404).json({ success: false, message: 'Submitted bid offer not found.' });
    }

    const bidRequest = await Bid.findByPk(offer.bidRequestId);
    if (!bidRequest) return res.status(404).json({ success: false, message: 'Bid request not found.' });

    if (bidRequest.requestedById !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Only request owner can accept this offer.' });
    }

    await offer.update({ status: 'Accepted' });
    await BidOffer.update(
      { status: 'Rejected' },
      { where: { bidRequestId: offer.bidRequestId, status: 'Submitted' } }
    );
    await bidRequest.update({ requestStatus: 'Closed' });

    return res.status(200).json({
      success: true,
      message: 'Bid offer accepted successfully. Next step: create order from this accepted bid.',
      bidRequest,
      acceptedOffer: offer
    });
  } catch (error) {
    console.error('Accept Bid Offer Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while accepting bid offer.' });
  }
};

module.exports = {
  createBidRequest,
  getOpenBidRequests,
  getMyBidRequests,
  submitBidOffer,
  getOffersForRequest,
  cancelMyBidOffer,
  acceptBidOffer
};
