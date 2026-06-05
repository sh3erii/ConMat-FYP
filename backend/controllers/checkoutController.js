const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const OrderStatusHistory = require('../models/OrderStatusHistory');
const { generateOrderNumber, calculateOrderTotals } = require('../services/orderNumberService');

const getAuthUserId = (req) => req.user?.id || req.user?.userId || req.body?.buyerId || null;
const getAuthUserRole = (req) => req.user?.role || req.body?.buyerRole || 'Customer';

const buildOrderResponse = (order, items = [], statusHistory = []) => ({
  id: order.id,
  orderNumber: order.orderNumber,
  buyerId: order.buyerId,
  buyerRole: order.buyerRole,
  status: order.status,
  orderStatus: order.orderStatus,
  paymentStatus: order.paymentStatus,
  subtotal: Number(order.subtotal || 0),
  shippingFee: Number(order.shippingFee || 0),
  taxAmount: Number(order.taxAmount || 0),
  totalAmount: Number(order.totalAmount || 0),
  shippingAddress: order.shippingAddress,
  contactPhone: order.contactPhone,
  notes: order.notes,
  items,
  statusHistory,
  createdAt: order.createdAt
});

const createCheckoutOrder = async (req, res) => {
  try {
    const buyerId = getAuthUserId(req);
    const buyerRole = getAuthUserRole(req);
    const {
      items = [],
      phone,
      city,
      address,
      deliveryNote,
      paymentMethod = 'stripe',
      totals
    } = req.body;

    if (!buyerId) {
      return res.status(401).json({ success: false, message: 'Login required to place order.' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one order item is required.' });
    }

    const calculatedTotals = totals?.total || totals?.totalAmount ? {
      subtotal: Number(totals.subtotal || 0),
      deliveryFee: Number(totals.deliveryFee || totals.shippingFee || 0),
      tax: Number(totals.tax || totals.taxAmount || 0),
      total: Number(totals.total || totals.totalAmount || 0)
    } : calculateOrderTotals(items);

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      buyerId,
      buyerRole,
      subtotal: calculatedTotals.subtotal,
      shippingFee: calculatedTotals.deliveryFee,
      taxAmount: calculatedTotals.tax,
      totalAmount: calculatedTotals.total,
      status: paymentMethod === 'cash_on_delivery' ? 'Pending' : 'Pending',
      orderStatus: 'Placed',
      paymentStatus: paymentMethod === 'cash_on_delivery' ? 'Pending' : 'Pending',
      shippingAddress: `${address}${city ? `, ${city}` : ''}`,
      contactPhone: phone,
      notes: deliveryNote || null
    });

    const orderItems = await Promise.all(
      items.map((item) => {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || item.price || 0);
        return OrderItem.create({
          orderId: order.id,
          productId: item.productId,
          sellerId: item.sellerId,
          productName: item.name,
          category: item.category || null,
          quantity,
          unit: item.unit || 'piece',
          pricingType: quantity >= 50 ? 'wholesale' : 'retail',
          unitPrice,
          lineTotal: quantity * unitPrice,
          productSnapshot: item
        });
      })
    );

    await OrderStatusHistory.create({
      orderId: order.id,
      status: 'Placed',
      title: 'Order placed',
      description: 'Buyer placed order successfully from checkout.',
      changedBy: buyerId
    });

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully.',
      order: buildOrderResponse(order, orderItems)
    });
  } catch (error) {
    console.error('createCheckoutOrder error:', error);
    return res.status(500).json({ success: false, message: 'Failed to place order.', error: error.message });
  }
};

const getMyCheckoutOrders = async (req, res) => {
  try {
    const buyerId = getAuthUserId(req);
    if (!buyerId) {
      return res.status(401).json({ success: false, message: 'Login required.' });
    }

    const orders = await Order.findAll({
      where: { buyerId },
      order: [['createdAt', 'DESC']]
    });

    return res.json({ success: true, orders });
  } catch (error) {
    console.error('getMyCheckoutOrders error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch orders.', error: error.message });
  }
};

const getCheckoutOrderDetail = async (req, res) => {
  try {
    const { orderId } = req.params;
    const buyerId = getAuthUserId(req);

    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (buyerId && Number(order.buyerId) !== Number(buyerId) && String(order.buyerId) !== String(buyerId) && req.user?.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'You cannot view this order.' });
    }

    const items = await OrderItem.findAll({ where: { orderId: order.id } });
    const statusHistory = await OrderStatusHistory.findAll({
      where: { orderId: order.id },
      order: [['createdAt', 'ASC']]
    });

    return res.json({
      success: true,
      order: buildOrderResponse(order, items, statusHistory)
    });
  } catch (error) {
    console.error('getCheckoutOrderDetail error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch order detail.', error: error.message });
  }
};

const cancelCheckoutOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason = 'Cancelled by buyer.' } = req.body;
    const buyerId = getAuthUserId(req);

    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (!['Placed', 'Confirmed', 'Processing'].includes(order.orderStatus)) {
      return res.status(400).json({ success: false, message: 'Only placed, confirmed or processing orders can be cancelled.' });
    }

    await order.update({ orderStatus: 'Cancelled', status: 'Cancelled', cancelledAt: new Date() });
    await OrderStatusHistory.create({
      orderId: order.id,
      status: 'Cancelled',
      title: 'Order cancelled',
      description: reason,
      changedBy: buyerId
    });

    return res.json({ success: true, message: 'Order cancelled successfully.', order });
  } catch (error) {
    console.error('cancelCheckoutOrder error:', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel order.', error: error.message });
  }
};

const getOrderStatusHistory = async (req, res) => {
  try {
    const { orderId } = req.params;
    const history = await OrderStatusHistory.findAll({
      where: { orderId },
      order: [['createdAt', 'ASC']]
    });
    return res.json({ success: true, history });
  } catch (error) {
    console.error('getOrderStatusHistory error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch status history.', error: error.message });
  }
};

module.exports = {
  createCheckoutOrder,
  getMyCheckoutOrders,
  getCheckoutOrderDetail,
  cancelCheckoutOrder,
  getOrderStatusHistory
};
