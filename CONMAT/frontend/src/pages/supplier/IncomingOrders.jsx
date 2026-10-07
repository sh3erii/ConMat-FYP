import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LoaderCircle, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import RoleNavbar from '../../components/common/RoleNavbar';
import formatCurrency from '../../utils/formatCurrency';
import './IncomingOrders.css';

const statusFlow = ['Placed', 'Confirmed', 'Processing', 'Packed', 'Dispatched', 'Delivered'];
const nextStatus = {
  Confirmed: { status: 'Processing', label: 'Start Processing' },
  Processing: { status: 'Packed', label: 'Mark as Packed' },
  Packed: { status: 'Dispatched', label: 'Mark as Dispatched' },
  Dispatched: { status: 'Delivered', label: 'Mark as Delivered' },
};

export default function IncomingOrders() {
  const statusUpdateInProgress = useRef(false);
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const refreshOrders = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const { data } = await api.get('/orders/incoming');
      setOrders(data.orders || []);
      setError('');
    } catch (err) {
      if (!silent) setError(err?.response?.data?.message || err?.message || 'Unable to load incoming orders.');
    } finally {
      if (!silent) setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => refreshOrders(), 0);
    const timer = window.setInterval(() => refreshOrders(true), 15000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [refreshOrders]);

  const filteredOrders = useMemo(() => {
    if (filter === 'All') return orders;
    return orders.filter((order) => (
      (order.items || []).some((item) => (item.fulfillmentStatus || order.orderStatus) === filter)
    ));
  }, [orders, filter]);

  const counts = useMemo(() => {
    return orders.reduce((acc, order) => {
      const statuses = new Set((order.items || []).map((item) => item.fulfillmentStatus || order.orderStatus));
      statuses.forEach((status) => { acc[status] = (acc[status] || 0) + 1; });
      return acc;
    }, {});
  }, [orders]);

  const [updatingItemId, setUpdatingItemId] = useState('');

  const updateProductItemStatus = async (orderId, itemId, newStatus, productName) => {
    if (statusUpdateInProgress.current) return;
    statusUpdateInProgress.current = true;
    setMessage('');
    setError('');
    setUpdatingItemId(itemId);
    try {
      const deliveryUpdate = window.prompt(
        `Optional delivery update for "${productName}" (location or note):`,
        ''
      );
      if (deliveryUpdate === null) return;
      await api.patch(`/orders/${orderId}/items/${itemId}/status`, {
        orderStatus: newStatus,
        description: deliveryUpdate.trim() || undefined,
      });
      await refreshOrders(true);
      setMessage(`Moved "${productName}" to ${newStatus}.`);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to update this product status.');
    } finally {
      statusUpdateInProgress.current = false;
      setUpdatingItemId('');
    }
  };

  return (
    <main className="incoming-orders-page">
      <RoleNavbar />

      <section className="incoming-orders-hero conmat-page-hero conmat-page-hero--after-nav">
        <div>
          <span>Seller Orders</span>
          <h1 className="fs-4 fs-md-1">Review incoming orders and update delivery progress.</h1>
        </div>
        <div className="incoming-orders-hero__actions conmat-hero-actions">
          <strong>{orders.length} Orders</strong>
          <button type="button" className="conmat-hero-action conmat-hero-action--secondary" onClick={() => refreshOrders()} disabled={refreshing}>
            <RefreshCw className={refreshing ? 'is-spinning' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh Orders'}
          </button>
        </div>
      </section>

      {(error || message) && <div className="incoming-orders-alert">{message || error}</div>}

      <section className="incoming-orders-filters d-flex flex-nowrap overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
        {['All', ...statusFlow, 'Cancelled'].map((status) => (
          <button
            key={status}
            type="button"
            className={filter === status ? 'active' : ''}
            onClick={() => setFilter(status)}
          >
            {status}
            <span>{status === 'All' ? orders.length : counts[status] || 0}</span>
          </button>
        ))}
      </section>

      {loading ? (
        <div className="incoming-orders-empty" style={{ padding: '1.5rem', minHeight: '60px', height: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', opacity: 0.8 }}>Loading incoming orders...</div>
      ) : filteredOrders.length ? (
        <section className="incoming-orders-list">
          {filteredOrders.map((order) => {
            const paymentPaid = order.paymentStatus === 'Paid';
            const orderItems = order.items || [];
            const commissionPercent = order.payout?.commissionRate == null
              ? 1
              : Number((Number(order.payout.commissionRate) * 100).toFixed(2));
            return (
              <article className="incoming-order-card" key={order.id}>
                <div className="incoming-order-card__head">
                  <div>
                    <span>#{order.orderNumber}</span>
                    <h2>{order.buyerRole} Order · Buyer: {order.buyerName || order.buyer?.name || 'Customer'}</h2>
                    <p>{order.createdAt ? new Date(order.createdAt).toLocaleString() : 'Recent'}</p>
                  </div>
                  <div className="incoming-order-card__badges">
                    <strong className={`status-${String(order.fulfillmentStatus || order.orderStatus || '').toLowerCase().replace(/\s+/g, '-')}`}>
                      {order.fulfillmentStatus || order.orderStatus}
                    </strong>
                    <small className={`payment-${String(order.paymentStatus || '').toLowerCase()}`}>
                      Payment: {order.paymentStatus}
                    </small>
                  </div>
                </div>

                {/* Per-Product Fulfillment Cards */}
                <div className="incoming-order-card__items">
                  {orderItems.map((item) => {
                    const itemStatus = item.fulfillmentStatus || order.orderStatus;
                    const itemAction = nextStatus[itemStatus];
                    const isItemUpdating = updatingItemId === item.id;
                    const itemDelivered = itemStatus === 'Delivered';
                    return (
                      <div className="incoming-order-item-row" key={item.id || item.productId}>
                        <div className="incoming-order-item-row__info">
                          <div className="incoming-order-item-row__title">
                            <strong>{item.productName}</strong>
                          </div>
                          <small>{item.quantity} {item.unit} · {item.pricingType} · {formatCurrency(item.lineTotal)}</small>
                          {item.deliveryAddress && (
                            <p className="incoming-order-item-dest">
                              <span>Destination:</span> {item.deliveryAddress} {item.deliveryCity ? `(${item.deliveryCity})` : ''}
                            </p>
                          )}
                          <p className="incoming-order-item-dest">
                            <span>Delivery:</span> {item.deliveryWindow || '2–3 days'} · Contact: {item.contactPhone || 'Not provided'}
                          </p>
                          <p className="incoming-order-item-dest">
                            <span>Payment:</span> {item.payment?.buyerPaymentStatus || order.paymentStatus} · Seller funds: {item.payment?.sellerPayoutStatus || order.payout?.status || 'Held'}
                          </p>
                          {item.buyerNote && (
                            <p className="incoming-order-item-note">
                              <span>Buyer Note:</span> "{item.buyerNote}"
                            </p>
                          )}
                          {item.sellerNote && (
                            <p className="incoming-order-item-seller-note">
                              <span>Your Note:</span> {item.sellerNote}
                            </p>
                          )}
                        </div>

                        <div className="incoming-order-item-row__action">
                          {paymentPaid && itemAction ? (
                            <button
                              type="button"
                              className="incoming-order-item-action-btn"
                              onClick={() => updateProductItemStatus(order.id, item.id, itemAction.status, item.productName)}
                              disabled={isItemUpdating}
                            >
                              {isItemUpdating && <LoaderCircle className="is-spinning" />}
                              {isItemUpdating ? 'Updating...' : itemAction.label}
                            </button>
                          ) : (
                            <span className="incoming-order-item-action-state">
                              {!paymentPaid
                                ? 'Awaiting Payment'
                                : itemDelivered
                                  ? '✓ Delivered'
                                  : itemStatus === 'Cancelled'
                                    ? 'Cancelled'
                                    : 'Completed'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="incoming-order-card__foot">
                  <div>
                    <span>Buyer Contact</span>
                    <p>{order.contactPhone || order.buyer?.phone || 'Not provided'}</p>
                    <small>{order.buyer?.email || order.shippingAddress}</small>
                  </div>
                  <div>
                    <span>Your Items Total</span>
                    <strong>{formatCurrency(order.totalAmount)}</strong>
                  </div>
                  <div className="incoming-order-card__payout">
                    <span>Seller Payout</span>
                    <strong>{order.payout ? formatCurrency(order.payout.netAmount) : 'Held in Escrow'}</strong>
                    <small>
                      {order.payout
                        ? `Status: ${order.payout.status} (${commissionPercent}% ConMat commission deducted)`
                        : 'Released when buyer confirms receipt or after 24h deadline'}
                    </small>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="incoming-orders-empty" style={{ padding: '1.5rem', minHeight: '60px', height: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', opacity: 0.8 }}>No orders found for this filter.</div>
      )}
    </main>
  );
}
