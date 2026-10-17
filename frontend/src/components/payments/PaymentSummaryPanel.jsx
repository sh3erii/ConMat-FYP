import './PaymentSummaryPanel.css';

const money = (value = 0) => new Intl.NumberFormat('en-PK', {
  style: 'currency',
  currency: 'PKR',
  maximumFractionDigits: 2,
}).format(value);

export default function PaymentSummaryPanel({ order }) {
  if (!order) return null;

  return (
    <aside className="payment-summary-panel">
      <div className="payment-summary-panel__head">
        <span>Order Summary</span>
        <strong>{order.orderNumber}</strong>
      </div>

      <div className="payment-summary-panel__items">
        {order.items?.map((item) => (
          <div className="payment-summary-panel__item" key={item.id || item.name}>
            <div>
              <strong>{item.name}</strong>
              <span>{item.quantity} {item.unit || 'qty'} × {money(item.unitPrice)}</span>
              <span>Estimated delivery: {item.delivery?.window || item.deliveryWindow || '2–3 days'}</span>
            </div>
            <b>{money(item.quantity * item.unitPrice)}</b>
          </div>
        ))}
      </div>

      <div className="payment-summary-panel__totals">
        <p><span>Subtotal</span><b>{money(order.subtotal)}</b></p>
        {Number(order.discount || 0) > 0 && <p><span>Wholesale Discount</span><b>-{money(order.discount)}</b></p>}
        <p><span>Delivery</span><b>{Number(order.deliveryCharges || 0) === 0 ? 'Free' : money(order.deliveryCharges)}</b></p>
        <p className="payment-summary-panel__grand"><span>Total Payable</span><b>{money(order.grandTotal)}</b></p>
      </div>
      <p className="payment-summary-panel__payout-note">Your payment is held by ConMat. Seller proceeds are released after you confirm receipt—or automatically 24 hours after delivery unless you pause release through Report on WhatsApp—less ConMat's 1% marketplace commission.</p>
    </aside>
  );
}
