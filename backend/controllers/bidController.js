const { Op } = require('sequelize');
const { Bid, BidOffer, User, Product, Order, OrderItem, OrderStatusEvent } = require('../models');
const { notifySafely } = require('../services/notificationService');
const { runInBackground } = require('../services/asyncService');
const { number, dateText } = require('../services/formatters');
const { defaultMethodsForSellers } = require('../services/payoutMethodService');
const { requireBidInventoryProduct, publicBidProduct } = require('../services/bidInventoryService');
const { bidsDB } = require('../config/database');
const { emitBidUpdate } = require('../services/socketService');

function assertRequester(user) {
  if (!['Customer', 'Retailer', 'Wholesaler'].includes(user.role)) {
    throw Object.assign(new Error('Only Customer, Retailer and Wholesaler accounts can create bulk requests.'), { status: 403 });
  }
}

function assertBidSeller(user) {
  if (user.role === 'Supplier') {
    if (user.verificationStatus !== 'Approved') {
      throw Object.assign(new Error('Supplier verification is required before bidding.'), { status: 403 });
    }
    return;
  }

  if (user.role === 'Wholesaler') return;

  throw Object.assign(new Error('Bid opportunities are available to verified Suppliers and Wholesalers only.'), { status: 403 });
}

function assertBidOpportunityViewer(user) {
  if (user.role === 'Retailer') return;
  assertBidSeller(user);
}

function parseRequestDeadline(value) {
  if (value === '' || value == null) return null;
  const raw = String(value).trim();
  let deadline;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-').map(Number);
    const calendarCheck = new Date(Date.UTC(year, month - 1, day));
    if (
      calendarCheck.getUTCFullYear() !== year
      || calendarCheck.getUTCMonth() !== month - 1
      || calendarCheck.getUTCDate() !== day
    ) {
      throw Object.assign(new Error('Request deadline must be a valid date.'), { status: 400 });
    }

    deadline = new Date(`${raw}T23:59:59.999+05:00`);
  } else {
    deadline = new Date(raw);
  }

  if (Number.isNaN(deadline.getTime())) {
    throw Object.assign(new Error('Request deadline must be a valid date.'), { status: 400 });
  }
  if (deadline <= new Date()) {
    throw Object.assign(new Error('Request deadline must be today or a future date.'), { status: 400 });
  }
  return deadline;
}

function withEffectiveRequestStatus(request) {
  const plain = typeof request.toJSON === 'function' ? request.toJSON() : { ...request };
  if (
    plain.requestStatus === 'Open'
    && plain.expiresAt
    && new Date(plain.expiresAt) <= new Date()
  ) {
    plain.requestStatus = 'Expired';
  }
  return plain;
}

function requireOpenBidRequest(request) {
  if (request.acceptedOfferId || request.requestStatus !== 'Open') {
    throw Object.assign(new Error('This bulk request is no longer accepting bids.'), { status: 409 });
  }
  if (request.expiresAt && new Date(request.expiresAt) <= new Date()) {
    throw Object.assign(new Error('This bulk request has expired and is no longer accepting bids.'), { status: 409 });
  }
}

async function enrichOffers(rows) {
  const ids = [...new Set(rows.map((offer) => offer.supplierId))];
  const productIds = [...new Set(rows.map((offer) => offer.productId).filter(Boolean))];
  const sellers = ids.length
    ? await User.findAll({
        where: { id: { [Op.in]: ids } },
        attributes: ['id', 'name', 'companyName', 'role', 'city'],
      })
    : [];
  const products = productIds.length
    ? await Product.findAll({ where: { id: { [Op.in]: productIds } } })
    : [];

  const map = Object.fromEntries(sellers.map((seller) => [seller.id, seller.toJSON()]));
  const productMap = Object.fromEntries(products.map((product) => [product.id, product]));

  return rows.map((offer) => {
    const plain = offer.toJSON();
    const seller = map[offer.supplierId];
    return {
      ...plain,
      supplierName: seller?.companyName || seller?.name || 'Seller',
      sellerName: seller?.companyName || seller?.name || 'Seller',
      supplierRole: seller?.role,
      city: seller?.city,
      ...publicBidProduct(productMap[offer.productId]),
    };
  });
}

async function enrichRequestsWithRequester(rows) {
  const requesterIds = [...new Set(rows.map((request) => request.requestedById))];
  const requesters = requesterIds.length
    ? await User.findAll({
        where: { id: { [Op.in]: requesterIds } },
        attributes: ['id', 'name', 'companyName', 'role', 'city'],
      })
    : [];
  const requesterMap = Object.fromEntries(
    requesters.map((requester) => [requester.id, requester.toJSON()])
  );

  return rows.flatMap((request) => {
    const plain = request.toJSON();
    const requester = requesterMap[request.requestedById];

    if (!requester) return [];
    return [{
      ...plain,
      requesterName: requester.companyName || requester.name || `${plain.requesterRole} buyer`,
      requesterRole: requester.role || plain.requesterRole,
      requesterCity: requester.city || plain.city,
      requestReference: plain.id.slice(0, 8).toUpperCase(),
    }];
  });
}

async function addParticipantSummaries(requests) {
  const requestIds = requests.map((request) => request.id);
  if (!requestIds.length) return requests;

  const offers = await BidOffer.findAll({
    where: {
      bidRequestId: { [Op.in]: requestIds },
      status: { [Op.ne]: 'Cancelled' },
    },
    attributes: ['bidRequestId', 'supplierId'],
    raw: true,
  });
  const supplierIds = [...new Set(offers.map((offer) => offer.supplierId))];
  const suppliers = supplierIds.length
    ? await User.findAll({
        where: { id: { [Op.in]: supplierIds } },
        attributes: ['id', 'name', 'companyName', 'role', 'city'],
        raw: true,
      })
    : [];
  const supplierById = Object.fromEntries(suppliers.map((supplier) => [supplier.id, supplier]));
  const participantsByRequest = {};

  offers.forEach((offer) => {
    const supplier = supplierById[offer.supplierId];
    if (!supplier) return;
    if (!participantsByRequest[offer.bidRequestId]) participantsByRequest[offer.bidRequestId] = [];
    participantsByRequest[offer.bidRequestId].push({
      id: supplier.id,
      name: supplier.companyName || supplier.name || 'Seller',
      role: supplier.role,
      city: supplier.city,
    });
  });

  return requests.map((request) => ({
    ...request,
    participants: participantsByRequest[request.id] || [],
  }));
}

async function acceptOfferForRequest({ request, offer }) {
  if (request.acceptedOfferId && request.acceptedOfferId !== offer.id) {
    throw Object.assign(new Error('A different bid has already been accepted for this request.'), { status: 409 });
  }
  if (offer.status === 'Cancelled' || offer.status === 'Rejected') {
    throw Object.assign(new Error('This bid offer is no longer available.'), { status: 409 });
  }

  const isAlreadyAccepted = request.acceptedOfferId === offer.id && offer.status === 'Accepted';
  if (!isAlreadyAccepted) requireOpenBidRequest(request);

  const product = await requireBidInventoryProduct({
    productId: offer.productId,
    sellerId: offer.supplierId,
    request,
  });

  if (request.acceptedOfferId !== offer.id || offer.status !== 'Accepted') {
    await request.update({ acceptedOfferId: offer.id, requestStatus: 'Closed' });
    await BidOffer.update(
      { status: 'Rejected' },
      { where: { bidRequestId: request.id, id: { [Op.ne]: offer.id }, status: 'Submitted' } }
    );
    await offer.update({ status: 'Accepted' });
  }

  return product;
}

exports.createRequest = async (req, res, next) => {
  try {
    assertRequester(req.user);

    const requiredQuantity = Math.floor(number(req.body.requiredQuantity));
    if (requiredQuantity < 1) {
      return res.status(400).json({ success: false, message: 'Required quantity must be at least 1.' });
    }

    const targetPrice = req.body.targetPrice === '' || req.body.targetPrice == null
      ? null
      : number(req.body.targetPrice);
    if (targetPrice !== null && targetPrice <= 0) {
      return res.status(400).json({ success: false, message: 'Target unit price must be greater than zero.' });
    }

    const expiresAt = parseRequestDeadline(req.body.expiresAt);
    const request = await Bid.create({
      requestedById: req.user.id,
      requesterRole: req.user.role,
      productId: req.body.productId || null,
      title: req.body.title || 'Bulk Material Request',
      category: req.body.category || null,
      city: req.body.city || req.user.city || 'Gujranwala',
      requiredQuantity,
      unit: req.body.unit || 'piece',
      targetPrice,
      deliveryAddress: req.body.deliveryAddress || null,
      expiresAt,
      notes: req.body.notes || null,
    });

    emitBidUpdate({ type: 'request-created', requestId: request.id });
    res.status(201).json({ success: true, message: 'Bulk order request created.', request, bidRequest: request });
  } catch (error) {
    next(error);
  }
};

exports.myRequests = async (req, res, next) => {
  try {
    assertRequester(req.user);
    const rows = await Bid.findAll({ where: { requestedById: req.user.id }, order: [['createdAt', 'DESC']] });
    const data = await Promise.all(rows.map(async (request) => {
      const normalized = withEffectiveRequestStatus(request);
      return {
        ...normalized,
        offersCount: await BidOffer.count({ where: { bidRequestId: request.id, status: { [Op.ne]: 'Cancelled' } } }),
        submittedAt: dateText(request.createdAt),
      };
    }));
    res.json({ success: true, requests: data, bidRequests: data, data });
  } catch (error) {
    next(error);
  }
};

exports.openRequests = async (req, res, next) => {
  try {
    assertBidOpportunityViewer(req.user);
    const includeHistory = req.user.role === 'Retailer'
      && String(req.query.includeHistory || '').toLowerCase() === 'true';
    const rows = await Bid.findAll({
      where: includeHistory
        ? {
            requestStatus: { [Op.ne]: 'Cancelled' },
            requestedById: { [Op.ne]: req.user.id },
          }
        : {
            requestStatus: 'Open',
            acceptedOfferId: null,
            requestedById: { [Op.ne]: req.user.id },
            [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }],
          },
      order: [['createdAt', 'DESC']],
    });
    const enrichedRequests = await enrichRequestsWithRequester(rows);
    const requests = req.user.role === 'Retailer'
      ? await addParticipantSummaries(enrichedRequests)
      : enrichedRequests;
    res.json({ success: true, requests, data: requests });
  } catch (error) {
    next(error);
  }
};

exports.requestOffers = async (req, res, next) => {
  try {
    const request = await Bid.findByPk(req.params.requestId);
    if (!request) return res.status(404).json({ success: false, message: 'Bulk request not found.' });
    if (request.requestedById !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Only the request owner can compare all bid offers.' });
    }

    const rows = await BidOffer.findAll({ where: { bidRequestId: request.id }, order: [['bidAmount', 'ASC']] });
    const offers = await enrichOffers(rows);
    res.json({ success: true, request, offers, data: offers });
  } catch (error) {
    next(error);
  }
};

exports.submitOffer = async (req, res, next) => {
  try {
    assertBidSeller(req.user);
    const requestId = req.body.bidRequestId || req.body.requestId;
    const request = await Bid.findByPk(requestId);
    if (!request) return res.status(404).json({ success: false, message: 'Bulk request not found.' });
    requireOpenBidRequest(request);
    if (request.requestedById === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot bid on your own request.' });
    }

    // Frontend labels this value as the bid amount *per unit*.
    const bidAmount = number(req.body.bidAmount || req.body.amount);
    if (bidAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Bid unit price must be greater than zero.' });
    }

    let product = await requireBidInventoryProduct({
      productId: req.body.productId,
      sellerId: req.user.id,
      request,
    });

    const deliveryDays = Math.max(1, Math.floor(number(req.body.deliveryDays || 3)));
    let offer;
    let created = false;
    let notificationRequest = request;

    await bidsDB.transaction(async (transaction) => {
      const lockedRequest = await Bid.findByPk(requestId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!lockedRequest) {
        throw Object.assign(new Error('Bulk request not found.'), { status: 404 });
      }
      requireOpenBidRequest(lockedRequest);
      if (lockedRequest.requestedById === req.user.id) {
        throw Object.assign(new Error('You cannot bid on your own request.'), { status: 400 });
      }


      product = await requireBidInventoryProduct({
        productId: req.body.productId,
        sellerId: req.user.id,
        request: lockedRequest,
      });

      offer = await BidOffer.findOne({
        where: { bidRequestId: lockedRequest.id, supplierId: req.user.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!offer) {
        offer = await BidOffer.create({
          bidRequestId: lockedRequest.id,
          supplierId: req.user.id,
          productId: product.id,
          bidAmount,
          deliveryDays,
          notes: req.body.notes || null,
        }, { transaction });
        created = true;
      } else {
        if (offer.status === 'Accepted') {
          throw Object.assign(new Error('An accepted bid cannot be modified.'), { status: 409 });
        }
        await offer.update({
          productId: product.id,
          bidAmount,
          deliveryDays,
          notes: req.body.notes || null,
          status: 'Submitted',
        }, { transaction });
      }

      notificationRequest = lockedRequest;
    });


    runInBackground('New bid notification failed', async () => {
      const requester = await User.findByPk(notificationRequest.requestedById);
      await notifySafely({
        userId: notificationRequest.requestedById,
        email: requester?.email,
        title: 'New bid received',
        message: `A new offer was submitted for ${notificationRequest.title}.`,
        type: 'Bid',
        actionUrl: `/bids/compare/${notificationRequest.id}`,
      }, 'New bid notification skipped');
    });

    emitBidUpdate({ type: created ? 'offer-created' : 'offer-updated', requestId: request.id, offerId: offer.id });
    res.status(created ? 201 : 200).json({ success: true, offer: { ...offer.toJSON(), ...publicBidProduct(product) } });
  } catch (error) {
    next(error);
  }
};

exports.myOffers = async (req, res, next) => {
  try {
    assertBidSeller(req.user);
    const rows = await BidOffer.findAll({ where: { supplierId: req.user.id }, order: [['createdAt', 'DESC']] });
    const offers = await enrichOffers(rows);
    res.json({ success: true, offers, data: offers });
  } catch (error) {
    next(error);
  }
};

exports.cancelOffer = async (req, res, next) => {
  try {
    const offer = await BidOffer.findByPk(req.params.offerId);
    if (!offer || offer.supplierId !== req.user.id) return res.status(404).json({ success: false, message: 'Offer not found.' });
    if (offer.status === 'Accepted') return res.status(409).json({ success: false, message: 'Accepted offers cannot be cancelled.' });
    await offer.update({ status: 'Cancelled' });
    emitBidUpdate({ type: 'offer-cancelled', requestId: offer.bidRequestId, offerId: offer.id });
    res.json({ success: true, offer });
  } catch (error) {
    next(error);
  }
};

exports.acceptOffer = async (req, res, next) => {
  try {
    const offer = await BidOffer.findByPk(req.params.offerId);
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found.' });
    const request = await Bid.findByPk(offer.bidRequestId);
    if (!request || request.requestedById !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the request owner can accept an offer.' });
    }

    const product = await acceptOfferForRequest({ request, offer });

    runInBackground('Bid acceptance notification failed', async () => {
      const seller = await User.findByPk(offer.supplierId);
      await notifySafely({
        userId: offer.supplierId,
        email: seller?.email,
        title: 'Bid accepted',
        message: `Your offer for ${request.title} was accepted.`,
        type: 'Bid',
        actionUrl: `/bids/compare/${request.id}`,
      }, 'Bid acceptance notification skipped');
    });

    emitBidUpdate({ type: 'offer-accepted', requestId: request.id, offerId: offer.id });
    res.json({ success: true, message: 'Bid accepted.', offer: { ...offer.toJSON(), ...publicBidProduct(product) }, request });
  } catch (error) {
    next(error);
  }
};

exports.convertToOrder = async (req, res, next) => {
  try {
    const offer = await BidOffer.findByPk(req.params.offerId);
    if (!offer) return res.status(404).json({ success: false, message: 'Bid offer not found.' });

    const request = await Bid.findByPk(offer.bidRequestId);
    if (!request || request.requestedById !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the bulk request owner can convert the bid.' });
    }

    const existing = await Order.findOne({ where: { sourceBidOfferId: offer.id } });
    if (existing) return res.json({ success: true, order: existing, orderId: existing.id });


    const product = await acceptOfferForRequest({ request, offer });

    const unitPrice = number(offer.bidAmount);
    const subtotal = unitPrice * number(request.requiredQuantity);
    const shippingFee = 0;
    const totalAmount = subtotal;
    const seller = await User.findByPk(offer.supplierId);
    const payoutMethods = seller ? await defaultMethodsForSellers([seller.id]) : new Map();
    if (!seller || !payoutMethods.has(seller.id)) {
      return res.status(409).json({ success: false, message: 'The seller must add a supported payout method before this bid can become an order.' });
    }

    const order = await Order.create({
      orderNumber: `CM-BID-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`,
      buyerId: req.user.id,
      buyerRole: req.user.role,
      buyerName: req.user.name,
      city: request.city,
      subtotal,
      shippingFee,
      totalAmount,
      shippingAddress: req.body.shippingAddress || request.deliveryAddress || req.user.street || request.city,
      contactPhone: req.body.contactPhone || req.user.phone || 'N/A',
      paymentMethod: req.body.paymentMethod || 'card',
      deliveryWindow: `${offer.deliveryDays} days`,
      sourceBidOfferId: offer.id,
      notes: request.notes || null,
    });

    await OrderItem.create({
      orderId: order.id,
      productId: product.id,
      sellerId: offer.supplierId,
      productName: product.name,
      category: product.category,
      unit: product.unit,
      quantity: request.requiredQuantity,
      pricingType: 'wholesale',
      unitPrice,
      lineTotal: subtotal,
      productSnapshot: {
        bulkRequestId: request.id,
        bulkRequestTitle: request.title,
        targetPrice: request.targetPrice,
        bidUnitPrice: unitPrice,
        catalogRetailPrice: product.retailPrice,
        catalogWholesalePrice: product.wholesalePrice,
        imageUrl: product.imageUrl,
      },
    });

    await OrderStatusEvent.create({
      orderId: order.id,
      status: 'Placed',
      description: 'Order created from accepted bulk bid.',
      updatedBy: req.user.id,
    });

    runInBackground('Bid order notification failed', async () => {
      await notifySafely({
        userId: offer.supplierId,
        email: seller?.email,
        title: 'Bid converted to order',
        message: `Your accepted offer for ${request.title} is now order ${order.orderNumber}.`,
        type: 'Order',
        actionUrl: '/supplier/incoming-orders',
      }, 'Bid order notification skipped');
    });

    emitBidUpdate({ type: 'offer-converted', requestId: request.id, offerId: offer.id });
    res.status(201).json({ success: true, message: 'Accepted bid converted to order.', order, orderId: order.id });
  } catch (error) {
    next(error);
  }
};

exports.decisionMatrix = async (req, res, next) => {
  try {
    const request = await Bid.findByPk(req.params.requestId);
    if (!request || request.requestedById !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Bulk request not found.' });
    }

    const offers = await enrichOffers(await BidOffer.findAll({
      where: { bidRequestId: request.id, status: { [Op.ne]: 'Cancelled' } },
      order: [['bidAmount', 'ASC']],
    }));

    const best = offers[0] || null;
    const quantity = number(request.requiredQuantity);
    const targetUnitPrice = number(request.targetPrice);
    const data = offers.map((offer, index) => {
      const unitSaving = request.targetPrice ? Math.max(0, targetUnitPrice - number(offer.bidAmount)) : 0;
      return {
        ...offer,
        rank: index + 1,
        unitPrice: number(offer.bidAmount),
        totalAmount: number(offer.bidAmount) * quantity,
        savingAgainstTarget: unitSaving * quantity,
        unitSavingAgainstTarget: unitSaving,
        recommended: best?.id === offer.id,
      };
    });

    res.json({ success: true, request, offers: data, data });
  } catch (error) {
    next(error);
  }
};
