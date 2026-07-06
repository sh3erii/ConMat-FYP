const { Op } = require('sequelize');
const Product = require('../models/Product');
const PricingSlab = require('../models/PricingSlab');

const sellerRoles = ['Supplier', 'Wholesaler', 'Retailer', 'Admin'];

const toMoney = (value) => Number(Number(value || 0).toFixed(2));

const isProductOwnerOrAdmin = (product, user) => {
  if (!product || !user) return false;
  return user.role === 'Admin' || String(product.sellerId) === String(user.id || user.userId);
};

const getAppliedPrice = async (product, quantity = 1) => {
  const qty = Number(quantity || 1);
  const slabs = await PricingSlab.findAll({
    where: { productId: product.id, isActive: true },
    order: [['minQty', 'ASC']]
  });

  const appliedSlab = slabs.find((slab) => {
    const min = Number(slab.minQty || 0);
    const max = slab.maxQty === null ? Infinity : Number(slab.maxQty);
    return qty >= min && qty <= max;
  });

  if (appliedSlab) {
    return {
      unitPrice: toMoney(appliedSlab.unitPrice),
      pricingType: 'slab',
      appliedSlab
    };
  }

  const minWholesaleQty = Number(product.minWholesaleQty || 0);
  const pricingType = qty >= minWholesaleQty ? 'wholesale' : 'retail';
  const unitPrice = pricingType === 'wholesale' ? product.wholesalePrice : product.retailPrice;

  return {
    unitPrice: toMoney(unitPrice),
    pricingType,
    appliedSlab: null
  };
};

const getProductPricingSlabs = async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await Product.findByPk(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    const slabs = await PricingSlab.findAll({
      where: { productId, isActive: true },
      order: [['minQty', 'ASC']]
    });

    return res.status(200).json({ success: true, product, slabs });
  } catch (error) {
    console.error('Get Pricing Slabs Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching pricing slabs.' });
  }
};

const createPricingSlab = async (req, res) => {
  try {
    if (!sellerRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only sellers and admins can create pricing slabs.' });
    }

    const { productId } = req.params;
    const product = await Product.findByPk(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    if (!isProductOwnerOrAdmin(product, req.user)) {
      return res.status(403).json({ success: false, message: 'You can create slabs only for your own product.' });
    }

    const { label, minQty, maxQty, unitPrice } = req.body;
    if (!minQty || !unitPrice || Number(minQty) < 1 || Number(unitPrice) < 0) {
      return res.status(400).json({ success: false, message: 'Valid minQty and unitPrice are required.' });
    }

    if (maxQty && Number(maxQty) < Number(minQty)) {
      return res.status(400).json({ success: false, message: 'maxQty must be greater than minQty.' });
    }

    const slab = await PricingSlab.create({
      productId,
      label: label || 'Wholesale slab',
      minQty,
      maxQty: maxQty || null,
      unitPrice
    });

    return res.status(201).json({ success: true, message: 'Pricing slab created successfully.', slab });
  } catch (error) {
    console.error('Create Pricing Slab Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while creating pricing slab.' });
  }
};

const updatePricingSlab = async (req, res) => {
  try {
    const slab = await PricingSlab.findByPk(req.params.slabId);
    if (!slab) return res.status(404).json({ success: false, message: 'Pricing slab not found.' });

    const product = await Product.findByPk(slab.productId);
    if (!isProductOwnerOrAdmin(product, req.user)) {
      return res.status(403).json({ success: false, message: 'You can update slabs only for your own product.' });
    }

    const allowed = ['label', 'minQty', 'maxQty', 'unitPrice', 'isActive'];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (updates.maxQty && updates.minQty && Number(updates.maxQty) < Number(updates.minQty)) {
      return res.status(400).json({ success: false, message: 'maxQty must be greater than minQty.' });
    }

    await slab.update(updates);
    return res.status(200).json({ success: true, message: 'Pricing slab updated successfully.', slab });
  } catch (error) {
    console.error('Update Pricing Slab Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while updating pricing slab.' });
  }
};

const deletePricingSlab = async (req, res) => {
  try {
    const slab = await PricingSlab.findByPk(req.params.slabId);
    if (!slab) return res.status(404).json({ success: false, message: 'Pricing slab not found.' });

    const product = await Product.findByPk(slab.productId);
    if (!isProductOwnerOrAdmin(product, req.user)) {
      return res.status(403).json({ success: false, message: 'You can delete slabs only for your own product.' });
    }

    await slab.update({ isActive: false });
    return res.status(200).json({ success: true, message: 'Pricing slab deactivated successfully.' });
  } catch (error) {
    console.error('Delete Pricing Slab Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while deleting pricing slab.' });
  }
};

const calculateProductPrice = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    if (!productId) return res.status(400).json({ success: false, message: 'productId is required.' });

    const product = await Product.findByPk(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    const applied = await getAppliedPrice(product, quantity);
    const total = toMoney(Number(quantity) * applied.unitPrice);

    return res.status(200).json({
      success: true,
      productId,
      quantity: Number(quantity),
      unitPrice: applied.unitPrice,
      pricingType: applied.pricingType,
      appliedSlab: applied.appliedSlab,
      total
    });
  } catch (error) {
    console.error('Calculate Product Price Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while calculating product price.' });
  }
};

const compareProducts = async (req, res) => {
  try {
    const { productIds, category, city, search, quantity = 1 } = req.query;
    const where = { status: 'Active' };

    if (productIds) where.id = { [Op.in]: productIds.split(',').map((id) => id.trim()).filter(Boolean) };
    if (category && category !== 'All') where.category = category;
    if (city && city !== 'All') where.city = { [Op.iLike]: `%${city}%` };
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { brand: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const products = await Product.findAll({ where, limit: 12, order: [['wholesalePrice', 'ASC']] });

    const compared = await Promise.all(products.map(async (product) => {
      const applied = await getAppliedPrice(product, quantity);
      return {
        id: product.id,
        sellerId: product.sellerId,
        name: product.name,
        category: product.category,
        brand: product.brand,
        city: product.city,
        unit: product.unit,
        stock: product.stock,
        retailPrice: toMoney(product.retailPrice),
        wholesalePrice: toMoney(product.wholesalePrice),
        calculatedUnitPrice: applied.unitPrice,
        calculatedTotal: toMoney(Number(quantity) * applied.unitPrice),
        pricingType: applied.pricingType,
        appliedSlab: applied.appliedSlab
      };
    }));

    compared.sort((a, b) => a.calculatedTotal - b.calculatedTotal);

    return res.status(200).json({ success: true, quantity: Number(quantity), count: compared.length, products: compared });
  } catch (error) {
    console.error('Compare Products Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while comparing products.' });
  }
};

module.exports = {
  getProductPricingSlabs,
  createPricingSlab,
  updatePricingSlab,
  deletePricingSlab,
  calculateProductPrice,
  compareProducts
};
