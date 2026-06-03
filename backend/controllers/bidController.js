// ============================================================
//  controllers/bidController.js  (Muhammad Nosherwan – 076926)
//  Day 4 – Stable bulk request and bid offer APIs
// ============================================================
const { Op } = require('sequelize');
const { Bid, BidOffer } = require('../models/Bid');
const { notifyBidAccepted, notifyBidStatus } = require('../services/bidNotificationService');

const buyerRoles = ['Wholesaler', 'Retailer', 'Admin'];
const sellerRoles = ['Supplier', 'Wholesaler', 'Retailer', 'Admin'];

const money = (value) => Number(Number(value || 0).toFixed(2));

const createBidRequest = async (req, res) => {
  try {
    if (!buyerRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only wholesalers, retailers and admins can create bulk requests.' });
    }

    const {
      productId,
      title,
      category,
      city,
      requiredQuantity,
      unit,
      targetPrice,
      deliveryAddress,
      notes,
      expiresAt
    } = req.body;

    if (!requiredQuantity || Number(requiredQuantity) < 1) {
      return res.status(400).json({ success: false, message: 'requiredQuantity is required and must be greater than 0.' });
    }

    const bidRequest = await Bid.create({
      requestedById: req.user.id,
      productId: productId || null,
      title: title || 'Bulk Material Request',
      category: category || null,
      city: city || 'Gujranwala',
      requiredQuantity,
      unit: unit || 'piece',
      targetPrice: targetPrice || null,
      deliveryAddress: deliveryAddress || null,
      notes: notes || null,
      expiresAt: expiresAt || null,
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
    if (!sellerRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only seller roles can view open bid requests.' });
    }

    const where = { requestStatus: 'Open' };
    if (req.query.city && req.query.city !== 'All') where.city = { [Op.iLike]: `%${req.query.city}%` };
    if (req.query.category && req.query.category !== 'All') where.category = req.query.category;
    if (req.query.search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${req.query.search}%` } },
        { notes: { [Op.iLike]: `%${req.query.search}%` } }
      ];
    }

    const bidRequests = await Bid.findAll({
      where,
      include: [{ model: BidOffer, as: 'offers' }],
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
      where: req.user.role === 'Admin' ? {} : { requestedById: req.user.id },
      include: [{ model: BidOffer, as: 'offers' }],
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({ success: true, count: bidRequests.length, bidRequests });
  } catch (error) {
    console.error('Get My Bid Requests Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching your bid requests.' });
  }
};

const getMyBidOffers = async (req, res) => {
  try {
    const where = req.user.role === 'Admin' ? {} : { supplierId: req.user.id };
    const offers = await BidOffer.findAll({
      where,
      include: [{ model: Bid, as: 'request' }],
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({ success: true, count: offers.length, offers });
  } catch (error) {
    console.error('Get My Bid Offers Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching bid offers.' });
  }
};

const submitBidOffer = async (req, res) => {
  try {
    if (!sellerRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only sellers can submit bid offers.' });
    }

    const { bidRequestId, bidAmount, deliveryDays, notes } = req.body;

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

    const existingOffer = await BidOffer.findOne({ where: { bidRequestId, supplierId: req.user.id } });

    if (existingOffer) {
      await existingOffer.update({ bidAmount, deliveryDays: deliveryDays || existingOffer.deliveryDays, notes: notes || existingOffer.notes, status: 'Submitted' });
      return res.status(200).json({ success: true, message: 'Bid offer updated successfully.', bidOffer: existingOffer });
    }

    const bidOffer = await BidOffer.create({
      bidRequestId,
      supplierId: req.user.id,
      bidAmount,
      deliveryDays: deliveryDays || 3,
      notes: notes || null,
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
      return res.status(403).json({ success: false, message: 'Only request owner or admin can view all offers.' });
    }

    const offers = await BidOffer.findAll({
      where: { bidRequestId: req.params.requestId },
      order: [['bidAmount', 'ASC'], ['deliveryDays', 'ASC']]
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

    if (offer.status === 'Accepted') {
      return res.status(400).json({ success: false, message: 'Accepted bid offer cannot be cancelled.' });
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
      return res.status(403).json({ success: false, message: 'Only request owner or admin can accept this offer.' });
    }

    await offer.update({ status: 'Accepted' });
    await BidOffer.update(
      { status: 'Rejected' },
      { where: { bidRequestId: offer.bidRequestId, id: { [Op.ne]: offer.id }, status: 'Submitted' } }
    );
    await bidRequest.update({ requestStatus: 'Closed', acceptedOfferId: offer.id });

    notifyBidAccepted({
      to: req.body.supplierEmail,
      supplierName: req.body.supplierName || 'Seller',
      orderId: bidRequest.id,
      bidAmount: offer.bidAmount
    }).catch((error) => console.warn('Bid accepted email skipped:', error.message));

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

const cancelBidRequest = async (req, res) => {
  try {
    const bidRequest = await Bid.findByPk(req.params.requestId);
    if (!bidRequest) return res.status(404).json({ success: false, message: 'Bid request not found.' });

    if (bidRequest.requestedById !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Only request owner or admin can cancel this request.' });
    }

    if (bidRequest.requestStatus === 'Closed') {
      return res.status(400).json({ success: false, message: 'Closed bid request cannot be cancelled.' });
    }

    await bidRequest.update({ requestStatus: 'Cancelled' });
    await BidOffer.update({ status: 'Cancelled' }, { where: { bidRequestId: bidRequest.id, status: 'Submitted' } });

    notifyBidStatus({
      to: req.body.email,
      title: 'Bid Request Cancelled',
      message: `Bid request ${bidRequest.title} has been cancelled.`
    }).catch((error) => console.warn('Bid cancellation email skipped:', error.message));

    return res.status(200).json({ success: true, message: 'Bid request cancelled successfully.', bidRequest });
  } catch (error) {
    console.error('Cancel Bid Request Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while cancelling bid request.' });
  }
};

const getBiddingDashboard = async (req, res) => {
  try {
    const myRequests = await Bid.count({ where: req.user.role === 'Admin' ? {} : { requestedById: req.user.id } });
    const openRequests = await Bid.count({ where: { requestStatus: 'Open' } });
    const myOffers = await BidOffer.count({ where: req.user.role === 'Admin' ? {} : { supplierId: req.user.id } });
    const acceptedOffers = await BidOffer.count({ where: req.user.role === 'Admin' ? { status: 'Accepted' } : { supplierId: req.user.id, status: 'Accepted' } });

    const submittedOffers = await BidOffer.findAll({ where: { status: 'Submitted' } });
    const totalSubmittedValue = submittedOffers.reduce((sum, offer) => sum + money(offer.bidAmount), 0);

    return res.status(200).json({
      success: true,
      summary: {
        myRequests,
        openRequests,
        myOffers,
        acceptedOffers,
        totalSubmittedValue: money(totalSubmittedValue)
      }
    });
  } catch (error) {
    console.error('Bidding Dashboard Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while loading bidding dashboard.' });
  }
};

module.exports = {
  createBidRequest,
  getOpenBidRequests,
  getMyBidRequests,
  getMyBidOffers,
  submitBidOffer,
  getOffersForRequest,
  cancelMyBidOffer,
  acceptBidOffer,
  cancelBidRequest,
  getBiddingDashboard
};
