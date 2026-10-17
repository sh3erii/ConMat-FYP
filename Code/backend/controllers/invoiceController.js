const { Invoice, Order, OrderItem, User } = require('../models');
const { Op } = require('sequelize');
const { number } = require('../services/formatters');


exports.listMine = async (req, res, next) => {
  try {
    const where = req.user.role === 'Admin' ? {} : { buyerId: req.user.id };
    const invoices = await Invoice.findAll({ where, order: [['issuedAt', 'DESC']] });
    const orderIds = invoices.map((invoice) => invoice.orderId);
    const orders = orderIds.length ? await Order.findAll({ where: { id: { [Op.in]: orderIds } } }) : [];
    const orderMap = Object.fromEntries(orders.map((order) => [order.id, order]));
    const data = invoices.map((invoice) => {
      const order = orderMap[invoice.orderId];
      return {
        id: invoice.id,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        orderId: invoice.orderId,
        orderNumber: order?.orderNumber || invoice.orderId,
        invoiceDate: invoice.issuedAt,
        paidAt: invoice.paidAt,
        status: invoice.status,
        amount: number(invoice.total),
        total: number(invoice.total),
      };
    });
    res.json({ success: true, invoices: data, data });
  } catch (e) { next(e); }
};

exports.getInvoice = async (req, res, next) => {
  try {
    const id = req.params.identifier;
    let invoice = await Invoice.findByPk(id).catch(() => null);
    if (!invoice) invoice = await Invoice.findOne({ where: { [Op.or]: [{ invoiceNumber: id }, { orderId: id }] } });
    if (!invoice) return res.status(404).json({ success: false, message: 'Paid invoice not found.' });
    const order = await Order.findByPk(invoice.orderId);
    if (!order || (req.user.role !== 'Admin' && order.buyerId !== req.user.id)) return res.status(404).json({ success: false, message: 'Invoice not found.' });
    const items = await OrderItem.findAll({ where: { orderId: order.id } });
    const buyer = await User.findByPk(order.buyerId, { attributes: ['id','name','email','phone','street','city','postalCode'] });
    const sellerIds = [...new Set(items.map((i) => i.sellerId).filter(Boolean))];
    const sellers = sellerIds.length ? await User.findAll({
      where: { id: { [Op.in]: sellerIds } },
      attributes: ['id','name','companyName','email','phone','street','city','postalCode','role']
    }) : [];
    const sellerMap = Object.fromEntries(sellers.map((s) => [s.id, s.toJSON()]));
    const seller = sellers.length === 1 ? sellers[0].toJSON() : { name: sellers.length ? 'Multiple ConMat sellers' : 'ConMat Seller', email: '', phone: '', city: '' };
    const address = (u) => [u?.street, u?.city, u?.postalCode].filter(Boolean).join(', ');

    const wholesaleDiscount = items.reduce((sum, item) => {
      const snap = item.productSnapshot || {};
      const retailPrice = number(snap.retailPrice);
      const unitPrice = number(item.unitPrice);
      const sellerRole = sellerMap[item.sellerId]?.role || snap.sellerRole;
      if (retailPrice > unitPrice && item.pricingType === 'wholesale' && sellerRole === 'Wholesaler') {
        return sum + ((retailPrice - unitPrice) * number(item.quantity));
      }
      return sum;
    }, 0);

    const chargedSubtotal = items.reduce((sum, item) => sum + number(item.lineTotal), 0);
    const discount = wholesaleDiscount;
    const subtotal = chargedSubtotal + discount;
    const deliveryCharges = number(invoice.deliveryFee || order.shippingFee || 0);
    const grandTotal = number(invoice.total || order.totalAmount);

    const data = {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      orderId: order.id,
      orderNumber: order.orderNumber,
      invoiceDate: invoice.issuedAt,
      paymentDate: invoice.paidAt,
      paymentMethod: order.paymentMethod || 'Stripe Card Payment',
      status: invoice.status,
      buyer: {
        name: buyer?.name || order.buyerName,
        email: buyer?.email || '',
        phone: buyer?.phone || order.contactPhone,
        address: address(buyer) || order.shippingAddress,
      },
      seller: {
        name: seller.companyName || seller.name,
        email: seller.email || '',
        phone: seller.phone || '',
        address: address(seller),
      },
      sellers: sellers.map((s) => ({
        id: s.id,
        name: s.companyName || s.name,
        email: s.email || '',
        phone: s.phone || '',
        address: address(s),
      })),
      items: items.map((i) => {
        const sellerInfo = sellerMap[i.sellerId];
        const sellerName = sellerInfo?.companyName || sellerInfo?.name || 'ConMat Seller';
        return {
          id: i.id,
          productId: i.productId,
          name: i.productName,
          sellerId: i.sellerId,
          seller: sellerInfo ? {
            id: sellerInfo.id,
            name: sellerName,
            email: sellerInfo.email || '',
            phone: sellerInfo.phone || '',
            address: address(sellerInfo),
          } : null,
          sellerName,
          quantity: i.quantity,
          unit: i.unit,
          unitPrice: number(i.unitPrice),
          total: number(i.lineTotal),
          pricingType: i.pricingType,
        };
      }),
      subtotal,
      deliveryCharges,
      discount,
      wholesaleDiscount,
      grandTotal,
    };
    res.json({ success: true, data, invoice: data });
  } catch (e) { next(e); }
};
