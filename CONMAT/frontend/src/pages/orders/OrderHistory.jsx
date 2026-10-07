import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MapPinned } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import RoleNavbar from '../../components/common/RoleNavbar';
import { useCart } from '../../context/CartContext';
import { cancelOrder, getMyOrders } from '../../services/orderService';
import { canCancelBuyerOrder, canProceedToOrderPayment } from '../../utils/orderActions';
import './OrderHistory.css';

const statuses = ['ALL', 'PLACED', 'CONFIRMED', 'PROCESSING', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'];

export default function OrderHistory() {
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState('');
  const location = useLocation();
  const [actionMessage, setActionMessage] = useState(location.state?.orderMessage || '');
  const [actionError, setActionError] = useState(false);
  const { clearCart } = useCart();

  useEffect(() => {
    let active = true;
    getMyOrders()
      .then((response) => {
        if (!active) return;
        setOrders(Array.isArray(response?.orders) ? response.orders : Array.isArray(response?.data) ? response.data : []);
      })
      .catch((err) => {
        if (!active) return;
        setOrders([]);
        setError(err.response?.data?.message || 'Unable to load your orders.');
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const handleCancelOrder = async (order) => {
    if (!canCancelBuyerOrder(order)) return;
    if (!window.confirm(`Cancel order ${order.orderNumber}? Reserved stock will be returned to the sellers.`)) return;
    const reason = window.prompt('Reason for cancellation (optional):', '') ?? null;
    if (reason === null) return;
    setUpdatingOrderId(order.id);
    setActionMessage('');
    setActionError(false);
    try {
      const response = await cancelOrder(order.id, reason.trim());
      const updatedOrder = { ...order, ...(response.order || {}), orderStatus: 'Cancelled', status: 'Cancelled' };
      setOrders((current) => current.map((item) => item.id === order.id ? updatedOrder : item));
      clearCart();
      setActionMessage(response.message || `Order ${order.orderNumber} was cancelled and your cart was cleared.`);
    } catch (err) {
      setActionError(true);
      setActionMessage(err.response?.data?.message || 'Unable to cancel this order.');
    } finally {
      setUpdatingOrderId('');
    }
  };

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      const currentStatus = String(order.fulfillmentStatus || order.orderStatus || order.status || '').toUpperCase();
      const statusMatch = status === 'ALL' || currentStatus === status || String(order.orderStatus || '').toUpperCase() === status;
      const termMatch = !term || [order.orderNumber, order.supplier, order.supplierName, order.city]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
      return statusMatch && termMatch;
    });
  }, [orders, search, status]);

  return (
    <>
      <RoleNavbar />
      <main className="order-history-page conmat-page-shell">
        <section className="order-history-hero conmat-page-hero">
          <div>
            <span className="order-history-hero__eyebrow">Order History</span>
            <h1>Track every construction material purchase.</h1>
            <p>Search by order number, supplier or city and filter orders by their current status.</p>
            <div className="order-history-hero__actions conmat-hero-actions">
              <Link
                to="/orders/tracking"
                state={{ from: `${location.pathname}${location.search}` }}
                className="order-history-hero__primary conmat-hero-action conmat-hero-action--primary"
              >
                <MapPinned />
                Track an Order
              </Link>
            </div>
          </div>
        </section>

        <section className="order-history-filters">
          <label>
            Search orders
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search supplier, city or order no." />
          </label>
          <label>
            Filter status
            <select className="conmat-filter-select" value={status} onChange={(event) => setStatus(event.target.value)}>
              {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </section>

        {error && <div className="order-history-empty"><p>{error}</p></div>}
        {actionMessage && (
          <div className={`order-history-action-message${actionError ? ' is-error' : ''}`} role="status">
            {actionMessage}
          </div>
        )}

        <section className="order-history-list">
          {loading ? (
            <div className="order-history-empty"><p>Loading orders...</p></div>
          ) : filteredOrders.map((order) => {
            const displayStatus = String(order.fulfillmentStatus || order.orderStatus || order.status || 'Placed').toUpperCase();
            const total = Number(order.total ?? order.totalAmount ?? 0);
            const items = Array.isArray(order.items) ? order.items : [];
            const canPay = canProceedToOrderPayment(order);
            const canCancel = canCancelBuyerOrder(order);
            const paymentActionLabel = String(order.paymentStatus || '').toUpperCase() === 'FAILED' ? 'Retry Payment' : 'Proceed to Payment';
            return (
              <article className="order-history-card" key={order.id}>
                <div className="order-history-card__main">
                  <div>
                    <span className="order-history-card__label">{order.orderNumber}</span>
                    <h2>{order.supplier || order.supplierName || 'ConMat Seller'}</h2>
                    <p>{order.city || 'Pakistan'}</p>
                    {items.length > 0 && (
                      <div className="order-history-card__items-preview" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                        {items.map((i) => (
                          <span
                            key={i.id || i.productId}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: '#f1f5f9',
                              border: '1px solid #e2e8f0',
                              fontSize: '11.5px',
                              color: '#334155',
                              fontWeight: '600',
                            }}
                          >
                            {i.productName || i.name}: <strong>{i.fulfillmentStatus || 'Placed'}</strong> · Est. {i.deliveryWindow || '2–3 days'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className={`order-history-status order-history-status--${displayStatus.toLowerCase().replace(/\s+/g, '-')}`}>{displayStatus}</span>
                </div>
                <div className="order-history-card__meta">
                  <p><span>Payment</span><strong>{String(order.paymentStatus || 'Pending').toUpperCase()}</strong></p>
                  <p><span>Items</span><strong>{items.length}</strong></p>
                  <p><span>Total</span><strong>{formatCurrency(total)}</strong></p>
                  <div className="order-history-card__actions">
                    <Link to={`/orders/${order.id}`} className="order-history-card__details">Open Details</Link>
                    {canPay && <Link to={`/payments/checkout/${order.id}`} className="order-history-card__pay">{paymentActionLabel}</Link>}
                    {canCancel && (
                      <button type="button" className="order-history-card__cancel" onClick={() => handleCancelOrder(order)} disabled={Boolean(updatingOrderId)}>
                        {updatingOrderId === order.id ? 'Cancelling...' : 'Cancel Order'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
          {!loading && !filteredOrders.length && !error && (
            <div className="order-history-empty"><h2>No orders found</h2><p>Try another search keyword or select all statuses.</p></div>
          )}
        </section>
      </main>
    </>
  );
}
