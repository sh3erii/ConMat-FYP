const { Op } = require('sequelize');
const Product = require('../models/Product');
const ProductReport = require('../models/ProductReport');
const User = require('../models/User');
const { publicFile } = require('../services/formatters');
const { notifySafely } = require('../services/notificationService');
const { runInBackground } = require('../services/asyncService');
const { pricingModelForRole, resolveProductPricing } = require('../services/productPricingService');
const { displayDate } = require('../services/securityLogService');
const { defaultMethodsForSellers } = require('../services/payoutMethodService');
const { emitToUser, emitToRole, emitMarketplaceUpdate } = require('../services/socketService');

const sellerRoles = ['Supplier','Wholesaler','Retailer'];
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const money = (value) => `PKR ${Number(value || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
const emitInventoryChange = (sellerId, payload) => {
  emitToUser(sellerId, 'inventory:changed', payload);
  emitToRole('Admin', 'inventory:changed', payload);
  emitMarketplaceUpdate(payload);
};

function productEmailDetails(product, seller) {
  const role = seller?.role || 'Seller';
  const details = {
    'Product ID': product.id,
    Product: product.name,
    Category: product.category,
    Brand: product.brand || 'Not provided',
    Seller: seller?.companyName || seller?.name || 'Unknown seller',
    'Seller role': role,
    City: product.city || seller?.city || 'Not provided',
    Stock: `${product.stock} ${product.unit}`,
    Status: product.status,
    Delivery: Number(product.deliveryCharge || 0) === 0
      ? 'Free delivery'
      : `${money(product.deliveryCharge)}${product.freeDeliveryMinQuantity ? ` (free from ${product.freeDeliveryMinQuantity} ${product.unit})` : ''}`,
  };
  if (role === 'Retailer') details['Retail price'] = money(product.retailPrice);
  if (role === 'Supplier') {
    details.Price = money(product.wholesalePrice);
    details['Minimum quantity'] = `${product.minWholesaleQty} ${product.unit}`;
  }
  if (role === 'Wholesaler') {
    details['Retail price'] = money(product.retailPrice);
    details['Wholesale price'] = money(product.wholesalePrice);
    details['Wholesale minimum'] = `${product.minWholesaleQty} ${product.unit}`;
  }
  return details;
}

async function assertSeller(user) {
  if (!sellerRoles.includes(user.role)) throw Object.assign(new Error('This action is for seller roles only.'), { status: 403 });
  if (user.verificationStatus !== 'Approved') throw Object.assign(new Error('Admin approval is required before managing products.'), { status: 403 });
}

function normalize(req, product, seller) {
  const p = product.toJSON ? product.toJSON() : { ...product };
  p.imageUrl = publicFile(req, p.imageUrl); p.image = p.imageUrl;
  p.deliveryCharge = Number(p.deliveryCharge || 0);
  p.withinCityDeliveryCharge = Number(p.withinCityDeliveryCharge || 0);
  p.freeDeliveryMinQuantity = p.freeDeliveryMinQuantity == null ? null : Number(p.freeDeliveryMinQuantity);
  if (seller) { const pricing = resolveProductPricing(p, seller.role, p.minWholesaleQty); p.sellerName = seller.companyName || seller.name; p.sellerRole = seller.role; p.sellerPayoutReady = Boolean(seller.payoutReady); p.marketplaceVisible = ['Active','OutOfStock'].includes(p.status) && p.sellerPayoutReady; p.pricingModel = pricingModelForRole(seller.role); p.price = pricing.pricingModel === 'minimum' ? pricing.unitPrice : Number(p.retailPrice); p.minimumOrderQty = pricing.pricingModel === 'minimum' ? pricing.minimumQuantity : 1; p.seller = { id: seller.id, name: p.sellerName, role: seller.role, city: seller.city }; }
  return p;
}

exports.list = async (req, res, next) => {
  try {
    const { search, category, city, minPrice, maxPrice, pricing = 'retail', sort = 'newest' } = req.query;
    const priceField = pricing === 'wholesale' ? 'wholesalePrice' : 'retailPrice';
    const where = { status: { [Op.in]: ['Active','OutOfStock'] } };
    if (search) where[Op.or] = ['name','brand','description'].map((key) => ({ [key]: { [Op.iLike]: `%${search}%` } }));
    if (category && category !== 'All') where.category = category;
    if (city && city !== 'All') where.city = { [Op.iLike]: String(city).trim() };
    if (num(minPrice) !== null || num(maxPrice) !== null) { where[priceField] = {}; if (num(minPrice) !== null) where[priceField][Op.gte] = num(minPrice); if (num(maxPrice) !== null) where[priceField][Op.lte] = num(maxPrice); }
    const order = sort === 'price_low' ? [[priceField,'ASC']] : sort === 'price_high' ? [[priceField,'DESC']] : sort === 'stock' ? [['stock','DESC']] : [['createdAt','DESC']];
    const products = await Product.findAll({ where, order });
    const sellerIds = [...new Set(products.map((p) => p.sellerId))];
    const sellers = sellerIds.length ? await User.findAll({
      where: {
        id: { [Op.in]: sellerIds },
        status: 'Active',
        verificationStatus: 'Approved',
      },
    }) : [];
    const payoutMethods = await defaultMethodsForSellers(sellers.map((seller) => seller.id));
    const payoutReadySellers = sellers.filter((seller) => payoutMethods.has(seller.id));
    for (const seller of payoutReadySellers) seller.payoutReady = true;
    const map = Object.fromEntries(payoutReadySellers.map((s) => [s.id, s]));
    const visible = products.filter((p) => Boolean(map[p.sellerId])).map((p) => normalize(req, p, map[p.sellerId]));
    res.json({ success: true, count: visible.length, products: visible, data: visible });
  } catch (e) { next(e); }
};

exports.mine = async (req, res, next) => { try { await assertSeller(req.user); const rows = await Product.findAll({ where: { sellerId: req.user.id }, order: [['createdAt','DESC']] }); const methods = await defaultMethodsForSellers([req.user.id]); req.user.payoutReady = methods.has(req.user.id); res.json({ success: true, products: rows.map((p) => normalize(req, p, req.user)) }); } catch (e) { next(e); } };
exports.getOne = async (req, res, next) => { try { const p = await Product.findByPk(req.params.id); if (!p || !['Active','OutOfStock'].includes(p.status)) return res.status(404).json({ success: false, message: 'Product not found.' }); const s = await User.findOne({ where: { id: p.sellerId, status: 'Active', verificationStatus: 'Approved' } }); const methods = s ? await defaultMethodsForSellers([s.id]) : new Map(); if (!s || !methods.has(s.id)) return res.status(404).json({ success: false, message: 'Product not found.' }); s.payoutReady = true; res.json({ success: true, product: normalize(req, p, s) }); } catch (e) { next(e); } };

exports.report = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product || !['Active', 'OutOfStock'].includes(product.status)) {
      return res.status(404).json({ success: false, message: 'Product listing not found.' });
    }
    if (product.sellerId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot report your own product listing.' });
    }

    const reason = String(req.body.reason || '').trim();
    const details = String(req.body.details || '').trim();
    if (!reason) return res.status(400).json({ success: false, message: 'Select a reason for the report.' });
    if (reason.length > 80 || details.length > 1000) {
      return res.status(400).json({ success: false, message: 'The report reason or details are too long.' });
    }

    const duplicate = await ProductReport.findOne({
      where: { productId: product.id, reporterId: req.user.id, status: 'Pending' }
    });
    if (duplicate) {
      return res.status(409).json({ success: false, message: 'You already have a pending report for this listing.' });
    }

    const [admins, seller] = await Promise.all([
      User.findAll({ where: { role: 'Admin', status: 'Active' }, attributes: ['id', 'email'] }),
      User.findByPk(product.sellerId, { attributes: ['id', 'name', 'companyName', 'role', 'city', 'email'] }),
    ]);
    if (!admins.length) {
      return res.status(503).json({ success: false, message: 'No active admin is available to receive this report.' });
    }

    const report = await ProductReport.create({
      productId: product.id,
      reporterId: req.user.id,
      reason,
      details: details || null
    });

    await Promise.all([
      ...admins.map(async (admin) => await notifySafely({
      userId: admin.id,
      email: admin.email,
      title: 'Product listing reported',
      message: `"${product.name}" was reported for ${reason}. Review the listing in Product Management.`,
      type: 'Report',
      actionUrl: `/admin/products?reported=${product.id}`,
      metadata: { reportId: report.id, productId: product.id, reporterId: req.user.id },
      emailDetails: {
        ...productEmailDetails(product, seller),
        Reporter: req.user.name,
        'Reporter email': req.user.email,
        'Report reason': reason,
        Details: details || 'No additional details provided',
        'Reported at': displayDate(report.createdAt),
      },
      }, 'Product report notification skipped')),
      seller && notifySafely({
        userId: seller.id,
        email: seller.email,
        title: 'Your product listing was reported',
        message: `Your listing "${product.name}" was reported for ${reason}. Review the listing details while the admin team investigates.`,
        type: 'Report',
        actionUrl: '/manage-products',
        metadata: { reportId: report.id, productId: product.id, action: 'reported' },
        emailDetails: {
          ...productEmailDetails(product, seller),
          'Report reason': reason,
          Details: details || 'No additional details provided',
          'Reported at': displayDate(report.createdAt),
        },
      }, 'Reported-product seller notification skipped'),
    ].filter(Boolean));

    res.status(201).json({ success: true, message: 'Report submitted to the admin team and the product seller was notified.', report: { id: report.id, status: report.status } });
  } catch (e) { next(e); }
};

exports.requestReview = async (req, res, next) => {
  try {
    await assertSeller(req.user);
    const product = await Product.findByPk(req.params.id);
    if (!product || product.sellerId !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    if (!['Hidden', 'Rejected'].includes(product.status)) {
      return res.status(409).json({ success: false, message: 'Only hidden or rejected listings can be submitted for another review.' });
    }

    const note = String(req.body.note || req.body.reviewNote || '').trim();
    if (!note) return res.status(400).json({ success: false, message: 'Add a note explaining the adjustments made.' });
    if (note.length > 1000) return res.status(400).json({ success: false, message: 'The review note cannot exceed 1000 characters.' });

    const admins = await User.findAll({ where: { role: 'Admin', status: 'Active' }, attributes: ['id', 'email'] });
    if (!admins.length) return res.status(503).json({ success: false, message: 'No active admin is available to review this listing.' });

    await product.update({ reviewRequestNote: note, reviewRequestedAt: new Date() });
    await Promise.all(admins.map(async (admin) => await notifySafely({
      userId: admin.id,
      email: admin.email,
      title: 'Product review requested',
      message: `${req.user.companyName || req.user.name} adjusted "${product.name}" and requested another review. Seller note: ${note}`,
      type: 'Verification',
      actionUrl: `/admin/products?review=${product.id}`,
      metadata: { productId: product.id, sellerId: req.user.id, action: 'review-requested', note },
      emailDetails: {
        ...productEmailDetails(product, req.user),
        'Seller email': req.user.email,
        'Adjustment note': note,
        'Requested at': displayDate(product.reviewRequestedAt),
      },
    }, 'Product review notification skipped')));

    res.json({ success: true, message: 'Review requested. The listing will remain hidden until an admin approves it.', product: normalize(req, product, req.user) });
  } catch (e) { next(e); }
};

async function payload(req, existing = null) {
  const fields = ['name','category','brand','unit','city','description'];
  const data = {}; for (const k of fields) if (req.body[k] !== undefined) data[k] = req.body[k];
  const role = req.user.role;
  const priceValue = (value, label) => { const n = num(value); if (n === null || n < 0) throw Object.assign(new Error(`${label} must be a non-negative number.`), { status: 400 }); return n; };
  const quantityValue = (value, label, minimum = 1) => { const parsed = num(value); const n = parsed === null ? null : Math.floor(parsed); if (n === null || !Number.isFinite(n) || n < minimum) throw Object.assign(new Error(`${label} must be at least ${minimum}.`), { status: 400 }); return n; };

  if (role === 'Retailer') {
    if (req.body.retailPrice !== undefined) {
      const retailPrice = priceValue(req.body.retailPrice, 'Retail price');
      data.retailPrice = retailPrice;
      data.wholesalePrice = retailPrice;
      data.minWholesaleQty = 1;
    } else if (!existing) {
      throw Object.assign(new Error('Retail price is required.'), { status: 400 });
    }
  } else if (role === 'Supplier') {
    const submittedPrice = req.body.price ?? req.body.wholesalePrice ?? req.body.retailPrice;
    if (submittedPrice !== undefined) {
      const price = priceValue(submittedPrice, 'Product price');
      data.retailPrice = price;
      data.wholesalePrice = price;
    } else if (!existing) {
      throw Object.assign(new Error('Product price is required.'), { status: 400 });
    }
    if (req.body.minWholesaleQty !== undefined) data.minWholesaleQty = quantityValue(req.body.minWholesaleQty, 'Minimum order quantity');
    else if (!existing) throw Object.assign(new Error('Minimum order quantity is required.'), { status: 400 });
  } else {
    if (req.body.retailPrice !== undefined) data.retailPrice = priceValue(req.body.retailPrice, 'Retail price');
    else if (!existing) throw Object.assign(new Error('Retail price is required.'), { status: 400 });
    if (req.body.wholesalePrice !== undefined) data.wholesalePrice = priceValue(req.body.wholesalePrice, 'Wholesale price');
    else if (!existing) throw Object.assign(new Error('Wholesale price is required.'), { status: 400 });
    if (req.body.minWholesaleQty !== undefined) data.minWholesaleQty = quantityValue(req.body.minWholesaleQty, 'Minimum wholesale quantity');
    else if (!existing) throw Object.assign(new Error('Minimum wholesale quantity is required.'), { status: 400 });
  }

  if (req.body.withinCityDeliveryCharge !== undefined) {
    data.withinCityDeliveryCharge = priceValue(req.body.withinCityDeliveryCharge, 'Delivery within city');
  } else if (!existing) {
    data.withinCityDeliveryCharge = 0;
  }
  if (req.body.deliveryCharge !== undefined) {
    data.deliveryCharge = priceValue(req.body.deliveryCharge, 'Delivery charge');
  } else if (!existing) {
    data.deliveryCharge = 0;
  }
  if (req.body.freeDeliveryMinQuantity !== undefined) {
    const threshold = String(req.body.freeDeliveryMinQuantity || '').trim();
    data.freeDeliveryMinQuantity = threshold ? quantityValue(threshold, 'Free delivery minimum quantity') : null;
  }
  const effectiveDeliveryCharge = data.deliveryCharge ?? Number(existing?.deliveryCharge || 0);
  if (Number(effectiveDeliveryCharge) === 0) data.freeDeliveryMinQuantity = null;

  if (req.body.stock !== undefined) data.stock = quantityValue(req.body.stock, 'Stock quantity', 0);
  if (req.file) data.imageUrl = `/uploads/products/${req.file.filename}`;
  if (!existing && !data.name) throw Object.assign(new Error('Product name is required.'), { status: 400 });
  if (data.stock !== undefined && existing && ['Active', 'OutOfStock'].includes(existing.status)) {
    data.status = data.stock === 0 ? 'OutOfStock' : 'Active';
  }
  return data;
}

exports.create = async (req, res, next) => {
  try {
    await assertSeller(req.user);
    const createData = await payload(req);
    const initialStatus = Number(createData.stock || 0) === 0 ? 'OutOfStock' : 'Active';
    const productCity = String(req.body.city || req.user.city || '').trim();
    if (!productCity) return res.status(400).json({ success: false, message: 'Seller city is required.' });
    const product = await Product.create({ ...createData, status: initialStatus, sellerId: req.user.id, city: productCity });
    emitInventoryChange(req.user.id, { productId: product.id, action: 'created' });

    const payoutMethods = await defaultMethodsForSellers([req.user.id]);
    const payoutReady = payoutMethods.has(req.user.id);
    req.user.payoutReady = payoutReady;
    res.status(201).json({
      success: true,
      message: payoutReady
        ? 'Product published successfully.'
        : 'Product saved. Add a payout method in Settings before it appears in the marketplace.',
      product: normalize(req, product, req.user),
    });

    runInBackground('Product listing admin notifications failed', async () => {
      const admins = await User.findAll({ where: { role: 'Admin', status: 'Active' }, attributes: ['id', 'email'] });
      await Promise.all(admins.map(async (admin) => await notifySafely({
        userId: admin.id,
        email: admin.email,
        title: 'New product listed',
        message: `${req.user.companyName || req.user.name} listed "${product.name}" on the marketplace.`,
        type: 'System',
        actionUrl: '/admin/products',
        metadata: { event: 'product-listed', productId: product.id, sellerId: req.user.id },
        emailDetails: {
          ...productEmailDetails(product, req.user),
          'Seller email': req.user.email,
          'Listed at': displayDate(product.createdAt),
        },
      }, 'Product listing admin notification skipped')));
    });
  } catch (e) { next(e); }
};
exports.update = async (req, res, next) => { try { await assertSeller(req.user); const p = await Product.findByPk(req.params.id); if (!p || (p.sellerId !== req.user.id && req.user.role !== 'Admin')) return res.status(404).json({ success: false, message: 'Product not found.' }); await p.update(await payload(req, p)); emitInventoryChange(p.sellerId, { productId: p.id, action: 'updated' }); res.json({ success: true, product: normalize(req, p, req.user) }); } catch (e) { next(e); } };
exports.stock = async (req, res, next) => { try { await assertSeller(req.user); const p = await Product.findByPk(req.params.id); if (!p || p.sellerId !== req.user.id) return res.status(404).json({ success: false, message: 'Product not found.' }); const stock = Math.floor(num(req.body.stock)); if (!Number.isFinite(stock) || stock < 0) return res.status(400).json({ success: false, message: 'Stock must be zero or greater.' }); const nextStatus = ['Active','OutOfStock'].includes(p.status) ? (stock === 0 ? 'OutOfStock' : 'Active') : p.status; await p.update({ stock, status: nextStatus }); emitInventoryChange(p.sellerId, { productId: p.id, action: 'stock-updated' }); res.json({ success: true, product: normalize(req, p, req.user) }); } catch (e) { next(e); } };
exports.remove = async (req, res, next) => { try { await assertSeller(req.user); const p = await Product.findByPk(req.params.id); if (!p || p.sellerId !== req.user.id) return res.status(404).json({ success: false, message: 'Product not found.' }); await p.destroy(); emitInventoryChange(p.sellerId, { productId: p.id, action: 'deleted' }); res.json({ success: true, message: 'Product deleted successfully.' }); } catch (e) { next(e); } };
