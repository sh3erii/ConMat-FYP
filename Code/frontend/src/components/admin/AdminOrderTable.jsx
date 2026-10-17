import { ClipboardList, Eye } from 'lucide-react';
import './AdminOrderTable.css';

const paymentClass = {
  Paid: 'paid',
  Pending: 'pending',
  Failed: 'failed',
  Refunded: 'refunded',
};

export default function AdminOrderTable({
  orders = [],
  onViewTimeline,
}) {
  if (!orders.length) {
    return (
      <div className="admin-order-empty">
        <ClipboardList />
        <h3>No orders found</h3>
        <p>
          Try another search keyword, city, payment status, or order status.
        </p>
      </div>
    );
  }

  return (
    <div className="admin-order-table-wrap">
      <div className="admin-order-table-head">
        <span>Order</span>
        <span>Buyer</span>
        <span>Seller</span>
        <span>Amount</span>
        <span>Payment</span>
        <span>Seller Funds</span>
        <span>Status</span>
        <span>Timeline</span>
      </div>

      {orders.map((order) => (
        <article className="admin-order-row" key={order.id}>
          <div className="admin-order-number">
            <strong>{order.orderNumber}</strong>
            <span>
              {order.itemsCount} items • {order.placedAt}
            </span>
          </div>

          <div className="admin-order-party">
            <strong>{order.buyerName}</strong>
            <span>
              {order.buyerRole} • {order.city}
            </span>
          </div>

          <div className="admin-order-party">
            <strong>{order.sellerName}</strong>
            {(order.items || []).map((item) => (
              <span key={item.id}>{item.productName}: {item.fulfillmentStatus} · Delivery {item.deliveryWindow || '2–3 days'}</span>
            ))}
          </div>

          <div className="admin-order-amount">
            PKR {Number(order.totalAmount).toLocaleString()}
          </div>

          <div>
            <span
              className={`admin-order-payment admin-order-payment--${
                paymentClass[order.paymentStatus] || 'pending'
              }`}
            >
              {order.paymentStatus}
            </span>
          </div>

          <div>
            <span className={`admin-order-payment admin-order-payment--${order.payoutStatus === 'Released' ? 'paid' : order.payoutStatus === 'ReleaseFailed' ? 'failed' : 'pending'}`}>
              {order.payoutStatus || 'NotFunded'}
            </span>
          </div>

          <div>
            <span className={`admin-order-status admin-order-status--${String(order.fulfillmentStatus || order.orderStatus || '').toLowerCase().replace(/\s+/g, '-')}`}>
              {order.fulfillmentStatus || order.orderStatus}
            </span>
          </div>

          <div className="admin-order-actions">
            <button
              type="button"
              onClick={() => onViewTimeline?.(order)}
            >
              <Eye />
              Timeline
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
