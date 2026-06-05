const { Op } = require('sequelize');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');

const sellerRoles = ['Supplier', 'Wholesaler', 'Retailer', 'Admin'];

const money = (value) => Number(Number(value || 0).toFixed(2));

const ensureSellerAccess = (req) => {
  if (!sellerRoles.includes(req.user.role)) {
    const error = new Error('Only seller roles can access inventory tools.');
    error.status = 403;
    throw error;
  }
};

const getSellerWhere = (req) => (req.user.role === 'Admin' && req.query.sellerId
  ? { sellerId: req.query.sellerId }
  : { sellerId: req.user.id });

const getInventorySummary = async (req, res) => {
  try {
    ensureSellerAccess(req);
    const where = getSellerWhere(req);
    const products = await Product.findAll({ where, order: [['createdAt', 'DESC']] });

    const totalProducts = products.length;
    const activeProducts = products.filter((item) => item.status === 'Active').length;
    const lowStockProducts = products.filter((item) => Number(item.stock || 0) > 0 && Number(item.stock || 0) <= 25).length;
    const outOfStockProducts = products.filter((item) => Number(item.stock || 0) === 0 || item.status === 'OutOfStock').length;
    const inventoryValue = products.reduce((sum, item) => sum + money(item.retailPrice) * Number(item.stock || 0), 0);
    const wholesaleInventoryValue = products.reduce((sum, item) => sum + money(item.wholesalePrice) * Number(item.stock || 0), 0);

    return res.status(200).json({
      success: true,
      summary: {
        totalProducts,
        activeProducts,
        lowStockProducts,
        outOfStockProducts,
        inventoryValue: money(inventoryValue),
        wholesaleInventoryValue: money(wholesaleInventoryValue)
      }
    });
  } catch (error) {
    console.error('Inventory Summary Error:', error.message);
    return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Server error while loading inventory summary.' });
  }
};

const getLowStockProducts = async (req, res) => {
  try {
    ensureSellerAccess(req);
    const threshold = Math.max(1, Number(req.query.threshold || 25));
    const where = {
      ...getSellerWhere(req),
      stock: { [Op.lte]: threshold }
    };

    const products = await Product.findAll({ where, order: [['stock', 'ASC']] });
    return res.status(200).json({ success: true, count: products.length, threshold, products });
  } catch (error) {
    console.error('Low Stock Error:', error.message);
    return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Server error while fetching low stock products.' });
  }
};

const getStockMovements = async (req, res) => {
  try {
    ensureSellerAccess(req);
    const where = getSellerWhere(req);
    if (req.query.productId) where.productId = req.query.productId;

    const movements = await StockMovement.findAll({
      where,
      include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'category', 'unit'] }],
      order: [['createdAt', 'DESC']],
      limit: Math.min(Number(req.query.limit || 50), 100)
    });

    return res.status(200).json({ success: true, count: movements.length, movements });
  } catch (error) {
    console.error('Stock Movements Error:', error.message);
    return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Server error while fetching stock movements.' });
  }
};

const updateProductStock = async (req, res) => {
  try {
    ensureSellerAccess(req);
    const { stock, reason, movementType = 'ManualUpdate' } = req.body;
    const newStock = Number(stock);

    if (!Number.isInteger(newStock) || newStock < 0) {
      return res.status(400).json({ success: false, message: 'Stock must be a non-negative integer.' });
    }

    const product = await Product.findByPk(req.params.productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    if (product.sellerId !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'You can update only your own product stock.' });
    }

    const previousStock = Number(product.stock || 0);
    await product.update({
      stock: newStock,
      status: newStock > 0 ? (product.status === 'OutOfStock' ? 'Active' : product.status) : 'OutOfStock'
    });

    const movement = await StockMovement.create({
      productId: product.id,
      sellerId: product.sellerId,
      previousStock,
      newStock,
      changeQuantity: newStock - previousStock,
      movementType,
      reason: reason || 'Manual stock update'
    });

    return res.status(200).json({ success: true, message: 'Stock updated successfully.', product, movement });
  } catch (error) {
    console.error('Update Product Stock Error:', error.message);
    return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Server error while updating product stock.' });
  }
};

const bulkUpdateStock = async (req, res) => {
  try {
    ensureSellerAccess(req);
    const updates = Array.isArray(req.body.updates) ? req.body.updates : [];
    if (!updates.length) {
      return res.status(400).json({ success: false, message: 'updates array is required.' });
    }

    const results = [];

    for (const item of updates) {
      const newStock = Number(item.stock);
      if (!item.productId || !Number.isInteger(newStock) || newStock < 0) {
        results.push({ productId: item.productId, success: false, message: 'Invalid productId or stock.' });
        continue;
      }

      const product = await Product.findByPk(item.productId);
      if (!product) {
        results.push({ productId: item.productId, success: false, message: 'Product not found.' });
        continue;
      }

      if (product.sellerId !== req.user.id && req.user.role !== 'Admin') {
        results.push({ productId: item.productId, success: false, message: 'Access denied.' });
        continue;
      }

      const previousStock = Number(product.stock || 0);
      await product.update({
        stock: newStock,
        status: newStock > 0 ? (product.status === 'OutOfStock' ? 'Active' : product.status) : 'OutOfStock'
      });

      await StockMovement.create({
        productId: product.id,
        sellerId: product.sellerId,
        previousStock,
        newStock,
        changeQuantity: newStock - previousStock,
        movementType: 'BulkUpdate',
        reason: item.reason || req.body.reason || 'Bulk stock update'
      });

      results.push({ productId: product.id, success: true, previousStock, newStock });
    }

    return res.status(200).json({ success: true, message: 'Bulk stock update completed.', results });
  } catch (error) {
    console.error('Bulk Stock Update Error:', error.message);
    return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Server error while bulk updating stock.' });
  }
};

module.exports = {
  getInventorySummary,
  getLowStockProducts,
  getStockMovements,
  updateProductStock,
  bulkUpdateStock
};
