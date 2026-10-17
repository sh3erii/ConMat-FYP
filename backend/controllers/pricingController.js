const { Op } = require('sequelize');
const Product = require('../models/Product');
const User = require('../models/User');
const { number, publicFile } = require('../services/formatters');
const { resolveProductPricing } = require('../services/productPricingService');

exports.calculate = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.body.productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    const quantity = Math.max(1, Math.floor(number(req.body.quantity || 1)));
    const seller = await User.findByPk(product.sellerId, { attributes: ['role'] });
    const pricing = resolveProductPricing(product, seller?.role, quantity);
    if (!pricing.meetsMinimum) return res.status(400).json({ success: false, message: `Minimum order quantity is ${pricing.minimumQuantity}.` });
    res.json({ success: true, data: { productId: product.id, quantity, pricingType: pricing.pricingType, pricingModel: pricing.pricingModel, unitPrice: pricing.unitPrice, total: quantity * pricing.unitPrice, minWholesaleQty: product.minWholesaleQty, minimumQuantity: pricing.minimumQuantity } });
  } catch (e) { next(e); }
};

exports.compare = async (req, res, next) => {
  try {
    const where = { status: { [Op.in]: ['Active','OutOfStock'] } };
    if (req.query.category) where.category = req.query.category;
    if (req.query.city && req.query.city !== 'All') where.city = { [Op.iLike]: String(req.query.city).trim() };
    if (req.query.productIds) where.id = { [Op.in]: String(req.query.productIds).split(',').filter(Boolean) };
    const products = await Product.findAll({ where, order: [['retailPrice','ASC']] });
    const users = await User.findAll({ where: { id: { [Op.in]: [...new Set(products.map((p)=>p.sellerId))] }, status: 'Active', verificationStatus: 'Approved' } });
    const map = Object.fromEntries(users.map((u)=>[u.id,u]));
    const quantity = Math.max(1, Math.floor(number(req.query.quantity || 1)));
    const data = products.filter((p)=>map[p.sellerId]).map((p) => {
      const seller = map[p.sellerId]; const pricing = resolveProductPricing(p, seller.role, quantity);
      return { id: p.id, productId: p.id, name: p.name, category: p.category, city: p.city, image: publicFile(req,p.imageUrl), sellerId: p.sellerId, sellerName: seller.companyName || seller.name, sellerRole: seller.role, quantity, pricingType: pricing.pricingType, pricingModel: pricing.pricingModel, unitPrice: pricing.unitPrice, total: pricing.unitPrice * quantity, minimumQuantity: pricing.minimumQuantity, meetsMinimum: pricing.meetsMinimum, stock: p.stock, unit: p.unit };
    });
    res.json({ success: true, data, products: data });
  } catch (e) { next(e); }
};
