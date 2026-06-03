// ============================================================
//  controllers/invoiceController.js
//  Owner: Muhammad Nosherwan (076926)
//  Day 5 – invoice lookup and printable invoice APIs
// ============================================================
const Invoice = require('../models/Invoice');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const { generateInvoiceNumber } = require('../services/invoiceNumberService');
const { buildInvoiceHtml } = require('../services/invoiceTemplateService');

const findOrCreateInvoice = async (order) => {
  let invoice = await Invoice.findOne({ where: { orderId: order.id } });

  if (!invoice) {
    invoice = await Invoice.create({
      invoiceNumber: generateInvoiceNumber(),
      orderId: order.id,
      buyerId: order.buyerId || null,
      paymentId: order.paymentId || null,
      subtotal: order.subtotal || 0,
      deliveryFee: order.shippingFee || 0,
      tax: order.taxAmount || 0,
      total: order.totalAmount || 0,
      status: order.paymentStatus === 'Paid' ? 'Paid' : 'Issued',
      paidAt: order.paymentStatus === 'Paid' ? new Date() : null
    });
  }

  return invoice;
};

const getInvoiceByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findByPk(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found for invoice.' });
    }

    const invoice = await findOrCreateInvoice(order);
    const items = await OrderItem.findAll({ where: { orderId: order.id } });

    return res.json({
      success: true,
      invoice,
      order,
      items
    });
  } catch (error) {
    console.error('getInvoiceByOrder error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch invoice.', error: error.message });
  }
};

const printInvoiceByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findByPk(orderId);

    if (!order) {
      return res.status(404).send('<h1>Order not found</h1>');
    }

    const invoice = await findOrCreateInvoice(order);
    const items = await OrderItem.findAll({ where: { orderId: order.id } });
    const html = buildInvoiceHtml({ invoice, order, items });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    console.error('printInvoiceByOrder error:', error);
    return res.status(500).send(`<h1>Invoice error</h1><p>${error.message}</p>`);
  }
};

const emailInvoiceByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const invoice = await findOrCreateInvoice(order);

    return res.json({
      success: true,
      message: 'Invoice email endpoint prepared. Connect emailService.sendInvoiceEmail during notification integration.',
      email,
      invoiceNumber: invoice.invoiceNumber
    });
  } catch (error) {
    console.error('emailInvoiceByOrder error:', error);
    return res.status(500).json({ success: false, message: 'Failed to prepare invoice email.', error: error.message });
  }
};

module.exports = {
  getInvoiceByOrder,
  printInvoiceByOrder,
  emailInvoiceByOrder
};
