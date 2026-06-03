const { Op } = require('sequelize');
const Product = require('../models/Product');

const sellerRoles = ['Supplier', 'Wholesaler', 'Retailer', 'Admin'];

const normalizePrice = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

const buildImageUrl = (req) => {
  if (!req.file) return null;
  return `/uploads/products/${req.file.filename}`;
};

const listProducts = async (req, res) => {
  try {
    const {
      search,
      category,
      city,
      minPrice,
      maxPrice,
      pricing = 'retail',
      sort = 'newest'
    } = req.query;

    const priceField = pricing === 'wholesale' ? 'wholesalePrice' : 'retailPrice';
    const where = { status: 'Active' };

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { brand: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (category && category !== 'All') where.category = category;
    if (city && city !== 'All') where.city = { [Op.iLike]: `%${city}%` };

    const min = normalizePrice(minPrice);
    const max = normalizePrice(maxPrice);
    if (min !== null || max !== null) {
      where[priceField] = {};
      if (min !== null) where[priceField][Op.gte] = min;
      if (max !== null) where[priceField][Op.lte] = max;
    }

    const orderMap = {
      newest: [['createdAt', 'DESC']],
      price_low: [[priceField, 'ASC']],
      price_high: [[priceField, 'DESC']],
      stock: [['stock', 'DESC']]
    };

    const products = await Product.findAll({
      where,
      order: orderMap[sort] || orderMap.newest
    });

    return res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    console.error('List Products Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching products.' });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product || product.status !== 'Active') {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    return res.status(200).json({ success: true, product });
  } catch (error) {
    console.error('Get Product Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching product.' });
  }
};

const getMyProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { sellerId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    return res.status(200).json({ success: true, count: products.length, products });
  } catch (error) {
    console.error('Get My Products Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching your products.' });
  }
};

const createProduct = async (req, res) => {
  try {
    if (!sellerRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only sellers can add products.' });
    }

    const {
      name,
      category,
      brand,
      unit,
      retailPrice,
      wholesalePrice,
      minWholesaleQty,
      stock,
      city,
      description
    } = req.body;

    if (!name || !category || !retailPrice || !wholesalePrice || stock === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, category, retail price, wholesale price and stock are required.'
      });
    }

    const product = await Product.create({
      sellerId: req.user.id,
      name: name.trim(),
      category,
      brand: brand || null,
      unit: unit || 'piece',
      retailPrice,
      wholesalePrice,
      minWholesaleQty: minWholesaleQty || 50,
      stock,
      city: city || 'Gujranwala',
      description: description || null,
      imageUrl: buildImageUrl(req),
      status: Number(stock) > 0 ? 'Active' : 'OutOfStock'
    });

    return res.status(201).json({
      success: true,
      message: 'Product added successfully.',
      product
    });
  } catch (error) {
    console.error('Create Product Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while creating product.' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    const isOwner = product.sellerId === req.user.id;
    const isAdmin = req.user.role === 'Admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'You can update only your own product.' });
    }

    const allowedFields = [
      'name', 'category', 'brand', 'unit', 'retailPrice', 'wholesalePrice',
      'minWholesaleQty', 'stock', 'city', 'description', 'status', 'isFeatured'
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (req.file) updates.imageUrl = buildImageUrl(req);
    if (updates.stock !== undefined && Number(updates.stock) <= 0) updates.status = 'OutOfStock';
    if (updates.stock !== undefined && Number(updates.stock) > 0 && product.status === 'OutOfStock') updates.status = 'Active';

    await product.update(updates);
    return res.status(200).json({ success: true, message: 'Product updated successfully.', product });
  } catch (error) {
    console.error('Update Product Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while updating product.' });
  }
};

const updateStock = async (req, res) => {
  try {
    const { stock } = req.body;
    if (stock === undefined || Number(stock) < 0) {
      return res.status(400).json({ success: false, message: 'Valid stock value is required.' });
    }

    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    if (product.sellerId !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'You can update only your own product stock.' });
    }

    await product.update({
      stock,
      status: Number(stock) > 0 ? 'Active' : 'OutOfStock'
    });

    return res.status(200).json({ success: true, message: 'Stock updated successfully.', product });
  } catch (error) {
    console.error('Update Stock Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while updating stock.' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    if (product.sellerId !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'You can delete only your own product.' });
    }

    await product.destroy();
    return res.status(200).json({ success: true, message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('Delete Product Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while deleting product.' });
  }
};

module.exports = {
  listProducts,
  getProductById,
  getMyProducts,
  createProduct,
  updateProduct,
  updateStock,
  deleteProduct
};
