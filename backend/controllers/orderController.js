const { Op } = require('sequelize');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Product = require('../models/Product');
const { sendOrderConfirmation, sendOrderStatusUpdate } = require('../services/emailService');

const buyerRoles = ['Customer', 'Retailer', 'Wholesaler', 'Admin'];
const sellerRoles = ['Supplier', 'Wholesaler', 'Retailer', 'Admin'];
const allowedStatuses = ['Placed', 'Confirmed', 'Processing', 'Dispatched', 'Delivered', 'Cancelled'];

const generateOrderNumber = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `CM-${datePart}-${randomPart}`;
};

const money = (value) => Number(Number(value || 0).toFixed(2));

const normalizeItems = (items = []) => items
  .map((item) => ({
    productId: item.productId,
    quantity: Math.max(1, Number(item.quantity || 1)),
    pricingType: item.pricingType === 'wholesale' ? 'wholesale' : 'retail'
  }))
  .filter((item) => item.productId && item.quantity > 0);

const getProductPrice = (product, item) => {
  if (item.pricingType === 'wholesale') return money(product.wholesalePrice);
  return money(product.retailPrice);
};

const buildOrderItems = (products, requestedItems) => {
  const productMap = new Map(products.map((product) => [product.id, product]));

  return requestedItems.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) {
      const error = new Error(`Product not found: ${item.productId}`);
      error.status = 404;
      throw error;
    }

    if (product.status !== 'Active') {
      const error = new Error(`${product.name} is not available for ordering.`);
      error.status = 400;
      throw error;
    }

    if (Number(product.stock) < item.quantity) {
      const error = new Error(`${product.name} has only ${product.stock} ${product.unit} in stock.`);
      error.status = 400;
      throw error;
    }

    if (item.pricingType === 'wholesale' && item.quantity < Number(product.minWholesaleQty || 1)) {
      const error = new Error(`${product.name} wholesale minimum quantity is ${product.minWholesaleQty}.`);
      error.status = 400;
      throw error;
    }

    const unitPrice = getProductPrice(product, item);
    const lineTotal = money(unitPrice * item.quantity);

    return {
      product,
      orderItem: {
        productId: product.id,
        sellerId: product.sellerId,
        productName: product.name,
        category: product.category,
        unit: product.unit,
        quantity: item.quantity,
        pricingType: item.pricingType,
        unitPrice,
        lineTotal,
        productSnapshot: {
          name: product.name,
          category: product.category,
          brand: product.brand,
          city: product.city,
          imageUrl: product.imageUrl,
          retailPrice: product.retailPrice,
          wholesalePrice: product.wholesalePrice,
          minWholesaleQty: product.minWholesaleQty
        }
      }
    };
  });
};

const attachItems = async (orders) => {
  const orderList = Array.isArray(orders) ? orders : [orders];
  const orderIds = orderList.map((order) => order.id);
  const items = await OrderItem.findAll({ where: { orderId: { [Op.in]: orderIds } } });
  const itemMap = items.reduce((acc, item) => {
    if (!acc[item.orderId]) acc[item.orderId] = [];
    acc[item.orderId].push(item);
    return acc;
  }, {});

  const withItems = orderList.map((order) => ({
    ...order.toJSON(),
    items: itemMap[order.id] || []
  }));

  return Array.isArray(orders) ? withItems : withItems[0];
};

const createOrder = async (req, res) => {
  try {
    if (!buyerRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only customers, retailers and wholesalers can place orders.' });
    }

    const { items, shippingAddress, contactPhone, notes } = req.body;
    const requestedItems = normalizeItems(items);

    if (!requestedItems.length) {
      return res.status(400).json({ success: false, message: 'At least one valid order item is required.' });
    }

    if (!shippingAddress || !contactPhone) {
      return res.status(400).json({ success: false, message: 'Shipping address and contact phone are required.' });
    }

    const productIds = requestedItems.map((item) => item.productId);
    const products = await Product.findAll({ where: { id: { [Op.in]: productIds } } });
    const preparedItems = buildOrderItems(products, requestedItems);

    const subtotal = money(preparedItems.reduce((sum, entry) => sum + entry.orderItem.lineTotal, 0));
    const taxAmount = money(subtotal * 0.02);
    const shippingFee = subtotal > 0 ? 1200 : 0;
    const totalAmount = money(subtotal + taxAmount + shippingFee);

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      buyerId: req.user.id,
      buyerRole: req.user.role,
      subtotal,
      taxAmount,
      shippingFee,
      totalAmount,
      shippingAddress,
      contactPhone,
      notes: notes || null
    });

    const orderItems = await OrderItem.bulkCreate(preparedItems.map((entry) => ({
      ...entry.orderItem,
      orderId: order.id
    })));

    await Promise.all(preparedItems.map(async ({ product, orderItem }) => {
      const nextStock = Math.max(0, Number(product.stock) - Number(orderItem.quantity));
      await product.update({
        stock: nextStock,
        status: nextStock === 0 ? 'OutOfStock' : product.status
      });
    }));

    sendOrderConfirmation({
      to: req.user.email,
      buyerName: req.user.name || 'ConMat Buyer',
      orderId: order.orderNumber,
      totalAmount
    }).catch((error) => console.warn('Order confirmation email skipped:', error.message));

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully.',
      order: { ...order.toJSON(), items: orderItems }
    });
  } catch (error) {
    console.error('Create Order Error:', error.message);
    return res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : 'Server error while placing order.'
    });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const where = req.user.role === 'Admin' ? {} : { buyerId: req.user.id };
    const orders = await Order.findAll({ where, order: [['createdAt', 'DESC']] });
    const data = await attachItems(orders);

    return res.status(200).json({ success: true, count: data.length, orders: data });
  } catch (error) {
    console.error('Get My Orders Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching orders.' });
  }
};

const getIncomingSellerOrders = async (req, res) => {
  try {
    if (!sellerRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only sellers can view incoming orders.' });
    }

    const sellerItems = await OrderItem.findAll({ where: { sellerId: req.user.id } });
    const orderIds = [...new Set(sellerItems.map((item) => item.orderId))];

    if (!orderIds.length) return res.status(200).json({ success: true, count: 0, orders: [] });

    const orders = await Order.findAll({
      where: { id: { [Op.in]: orderIds } },
      order: [['createdAt', 'DESC']]
    });

    const data = await attachItems(orders);
    return res.status(200).json({ success: true, count: data.length, orders: data });
  } catch (error) {
    console.error('Get Incoming Orders Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching incoming orders.' });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    const items = await OrderItem.findAll({ where: { orderId: order.id } });
    const isBuyer = order.buyerId === req.user.id;
    const isSeller = items.some((item) => item.sellerId === req.user.id);

    if (req.user.role !== 'Admin' && !isBuyer && !isSeller) {
      return res.status(403).json({ success: false, message: 'Access denied for this order.' });
    }

    return res.status(200).json({ success: true, order: { ...order.toJSON(), items } });
  } catch (error) {
    console.error('Get Order Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching order.' });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus, paymentStatus } = req.body;
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    const items = await OrderItem.findAll({ where: { orderId: order.id } });
    const isSeller = items.some((item) => item.sellerId === req.user.id);

    if (req.user.role !== 'Admin' && !isSeller) {
      return res.status(403).json({ success: false, message: 'Only admin or order seller can update status.' });
    }

    const updates = {};
    if (orderStatus) {
      if (!allowedStatuses.includes(orderStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid order status.' });
      }
      updates.orderStatus = orderStatus;
    }

    if (paymentStatus && req.user.role === 'Admin') {
      updates.paymentStatus = paymentStatus;
      updates.status = paymentStatus === 'Paid' ? 'Paid' : order.status;
    }

    await order.update(updates);

    sendOrderStatusUpdate({
      to: req.user.email,
      orderId: order.orderNumber,
      status: order.orderStatus
    }).catch((error) => console.warn('Order status email skipped:', error.message));

    return res.status(200).json({ success: true, message: 'Order status updated successfully.', order });
  } catch (error) {
    console.error('Update Order Status Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while updating order status.' });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (order.buyerId !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Only buyer or admin can cancel this order.' });
    }

    if (['Dispatched', 'Delivered', 'Cancelled'].includes(order.orderStatus)) {
      return res.status(400).json({ success: false, message: `Order cannot be cancelled after ${order.orderStatus}.` });
    }

    const items = await OrderItem.findAll({ where: { orderId: order.id } });

    await Promise.all(items.map(async (item) => {
      const product = await Product.findByPk(item.productId);
      if (product) {
        const restoredStock = Number(product.stock || 0) + Number(item.quantity || 0);
        await product.update({ stock: restoredStock, status: product.status === 'OutOfStock' ? 'Active' : product.status });
      }
    }));

    await order.update({
      orderStatus: 'Cancelled',
      status: 'Cancelled',
      cancelledAt: new Date()
    });

    return res.status(200).json({ success: true, message: 'Order cancelled and stock restored.', order });
  } catch (error) {
    console.error('Cancel Order Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error while cancelling order.' });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getIncomingSellerOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder
};
