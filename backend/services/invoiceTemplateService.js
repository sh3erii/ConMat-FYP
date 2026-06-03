const { formatPKR } = require('./invoiceNumberService');

function buildInvoiceHtml({ invoice, order, items = [] }) {
  const rows = items
    .map((item) => {
      const name = item.productName || item.name || 'Material item';
      const quantity = item.quantity || 0;
      const unit = item.unit || '';
      const unitPrice = item.unitPrice || item.unit_price || 0;
      const lineTotal = item.lineTotal || item.line_total || Number(quantity) * Number(unitPrice);
      return `
        <tr>
          <td>${name}</td>
          <td>${quantity} ${unit}</td>
          <td>${formatPKR(unitPrice)}</td>
          <td>${formatPKR(lineTotal)}</td>
        </tr>`;
    })
    .join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${invoice.invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f7fb; margin: 0; padding: 32px; color: #111827; }
    .invoice { max-width: 900px; margin: auto; background: #fff; border-radius: 24px; overflow: hidden; box-shadow: 0 24px 55px rgba(15,23,42,.12); }
    .head { background: #1c2333; color: white; padding: 30px; display: flex; justify-content: space-between; gap: 20px; }
    .brand { color: #b45309; font-weight: 900; margin-bottom: 8px; }
    h1 { margin: 0; font-size: 34px; }
    .meta { text-align: right; color: #d1d5db; }
    .body { padding: 30px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 26px; }
    .box { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 18px; padding: 18px; }
    .box span { display: block; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 900; letter-spacing: .08em; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; }
    th { text-align: left; color: #64748b; border-bottom: 1px solid #e5e7eb; padding: 12px; font-size: 12px; text-transform: uppercase; }
    td { border-bottom: 1px solid #eef2f7; padding: 14px 12px; font-weight: 700; }
    .totals { margin-left: auto; max-width: 360px; margin-top: 24px; }
    .totals p { display: flex; justify-content: space-between; margin: 10px 0; color: #64748b; font-weight: 800; }
    .totals .total { border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 22px; color: #111827; }
    .print { margin-top: 24px; text-align: center; }
    .print button { background: #b45309; color: white; border: 0; border-radius: 14px; padding: 13px 18px; font-weight: 900; cursor: pointer; }
    @media print { body { background: #fff; padding: 0; } .invoice { box-shadow: none; border-radius: 0; } .print { display: none; } }
  </style>
</head>
<body>
  <section class="invoice">
    <div class="head">
      <div>
        <div class="brand">ConMat</div>
        <h1>Invoice</h1>
        <p>Construction Material Wholesale & Retail Marketplace</p>
      </div>
      <div class="meta">
        <strong>${invoice.invoiceNumber}</strong><br/>
        <span>${new Date(invoice.issuedAt || invoice.createdAt || Date.now()).toLocaleString()}</span><br/>
        <span>Status: ${invoice.status}</span>
      </div>
    </div>
    <div class="body">
      <div class="grid">
        <div class="box"><span>Order</span><strong>${order.orderNumber || order.order_number || order.id}</strong><p>${order.shippingCity || order.shipping_city || ''}</p></div>
        <div class="box"><span>Buyer</span><strong>${order.buyerName || order.buyer_name || 'ConMat Buyer'}</strong><p>${order.buyerPhone || order.buyer_phone || ''}</p></div>
      </div>
      <table>
        <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4">No items found</td></tr>'}</tbody>
      </table>
      <div class="totals">
        <p><span>Subtotal</span><strong>${formatPKR(invoice.subtotal)}</strong></p>
        <p><span>Delivery</span><strong>${formatPKR(invoice.deliveryFee || invoice.delivery_fee)}</strong></p>
        <p><span>Tax</span><strong>${formatPKR(invoice.tax)}</strong></p>
        <p class="total"><span>Total</span><strong>${formatPKR(invoice.total)}</strong></p>
      </div>
      <div class="print"><button onclick="window.print()">Print / Save as PDF</button></div>
    </div>
  </section>
</body>
</html>`;
}

module.exports = {
  buildInvoiceHtml,
};
