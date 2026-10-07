import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, LoaderCircle, MapPin, Phone, Truck } from 'lucide-react';
import RoleNavbar from '../../components/common/RoleNavbar';
import TrackingTimeline from '../../components/orders/TrackingTimeline';
import { getOrderTracking } from '../../services/notificationService';
import { confirmItemDelivery, getMyOrders, reportItemIssue } from '../../services/orderService';
import { whatsappDeliverySupportUrl } from '../../utils/whatsappSupport';
import './OrderTracking.css';

export default function OrderTracking() {
  const { orderId } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedItem = searchParams.get('item') || 'all';
  const [prevOrderId, setPrevOrderId] = useState(orderId);
  const [trackingData, setTrackingData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState(false);

  if (orderId !== prevOrderId) {
    setPrevOrderId(orderId);
    setTrackingData(null);
    setError('');
  }

  const loadTracking = useCallback(async (active = true) => {
    if (!orderId) {
      try {
        const response = await getMyOrders();
        if (active) setOrders(response?.orders || response?.data || []);
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Unable to load orders.');
      } finally { /* Loading state is represented by the empty selector. */ }
      return;
    }

    try {
      const data = await getOrderTracking(orderId);
      if (!active) return;
      setTrackingData({
        order: data.order || null,
        events: Array.isArray(data.events) ? data.events : [],
        items: Array.isArray(data.items) ? data.items : [],
      });
      setError('');
    } catch (err) {
      if (!active) return;
      setError(err.response?.data?.message || 'Unable to load tracking information.');
    } finally { /* Tracking content updates when the response is committed. */ }
  }, [orderId]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => loadTracking(active), 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadTracking]);

  const handleConfirmItem = async (item) => {
    const itemName = item.productName || item.name || 'this product';
    const sellerName = item.seller?.companyName || item.seller?.name || 'seller';
    if (!window.confirm(`Confirm receipt of "${itemName}" from ${sellerName}? Their payout can be released once all of their products in this order are confirmed.`)) return;
    const note = window.prompt('Optional confirmation note:', '') ?? null;
    if (note === null) return;
    setActionLoading(`confirm-${item.id}`);
    setActionMessage('');
    try {
      const response = await confirmItemDelivery(orderId, item.id, note);
      setActionError(false);
      setActionMessage(response.message || `Delivery confirmed for ${itemName}.`);
      await loadTracking(true);
    } catch (err) {
      setActionError(true);
      setActionMessage(err.response?.data?.message || `Unable to confirm delivery for ${itemName}.`);
    } finally {
      setActionLoading('');
    }
  };

  const handleReportItem = async (item) => {
    const itemName = item.productName || item.name || 'this product';
    const whatsappUrl = whatsappDeliverySupportUrl({ orderNumber: trackingData?.order?.orderNumber, productName: itemName });
    if (item.deliveryResolution === 'IssueReported') {
      window.location.assign(whatsappUrl);
      return;
    }
    setActionLoading(`report-${item.id}`);
    setActionMessage('');
    try {
      await reportItemIssue(orderId, item.id, {
        reason: 'WhatsApp support requested',
        details: 'Buyer opened ConMat WhatsApp support for this delivery.',
      });
      setActionError(false);
      window.location.assign(whatsappUrl);
    } catch (err) {
      setActionError(true);
      setActionMessage(err.response?.data?.message || `Unable to pause payment release before opening WhatsApp for ${itemName}.`);
    } finally {
      setActionLoading('');
    }
  };

  if (!orderId) {
    return (
      <>
        <RoleNavbar />
        <main className="order-tracking-page conmat-page-shell">
          <section className="order-tracking-page__hero conmat-page-hero">
            <div>
              <p>Order Tracking</p>
              <h1>Select an order to track</h1>
              <span>Choose one of your recent purchases to view its fulfillment timeline.</span>
            </div>
            <div className="order-tracking-page__truck"><Truck /></div>
          </section>
          <div className="order-tracking-page__actions">
            <Link to="/orders"><ArrowLeft />Back</Link>
          </div>
          {error && <p className="order-tracking-error">{error}</p>}
          <section className="order-tracking-selector" aria-label="Orders available for tracking">
            {orders.map((order) => (
              <article key={order.id} className="order-tracking-selector__item">
                <div>
                  <span>{order.fulfillmentStatus || order.orderStatus || order.status}</span>
                  <h2>{order.orderNumber}</h2>
                  <p>{order.supplier || order.supplierName || 'ConMat Seller'} · {order.city || 'Pakistan'}</p>
                </div>
                <Link
                  to={`/orders/${order.id}/tracking`}
                  state={{ from: `${location.pathname}${location.search}` }}
                >
                  Track this order
                </Link>
              </article>
            ))}
            {!orders.length && !error && <p>No orders are available for tracking yet.</p>}
          </section>
        </main>
      </>
    );
  }

  const events = trackingData?.events || [];
  const items = trackingData?.items || [];
  const order = trackingData?.order || null;
  const activeItem = items.find((i) => String(i.id) === String(requestedItem)) || null;
  const currentPath = `${location.pathname}${location.search}`;
  const sourcePath = typeof location.state?.from === 'string' && location.state.from.startsWith('/')
    ? location.state.from
    : '';
  const returnPath = sourcePath && sourcePath !== currentPath ? sourcePath : '/orders/tracking';

  const displayEvents = activeItem
    ? (Array.isArray(activeItem.timeline) && activeItem.timeline.length ? activeItem.timeline : events)
    : events;

  const completed = displayEvents.filter((event) => event.completed).length;
  const displayStatus = String(
    activeItem ? (activeItem.fulfillmentStatus || 'Placed') : (order?.fulfillmentStatus || order?.orderStatus || 'In Progress')
  ).toUpperCase();

  return (
    <>
      <RoleNavbar />
      <main className="order-tracking-page conmat-page-shell">
        <section className="order-tracking-page__hero conmat-page-hero">
          <div>
            <p>Order Tracking</p>
            <h1>{order?.orderNumber || orderId}</h1>
            <span>
              Status: <strong>{displayStatus}</strong> · {completed} of {displayEvents.length || 5} milestones reached.
            </span>
          </div>
          <div className="order-tracking-page__truck"><Truck /></div>
        </section>

        <div className="order-tracking-page__actions">
          <Link to={returnPath} replace><ArrowLeft />Back</Link>
        </div>

        {actionMessage && (
          <p className={actionError ? 'order-tracking-alert is-error' : 'order-tracking-alert'}>
            {actionMessage}
          </p>
        )}
        {error && <p className="order-tracking-alert is-error">{error}</p>}

        {/* Selected Product Spotlight Card */}
        {activeItem && (
          <section className="order-tracking-item-spotlight">
            <div className="order-tracking-item-spotlight__head">
              <div>
                <span className="order-tracking-item-spotlight__seller">
                  Seller: <strong>{activeItem.seller?.companyName || activeItem.seller?.name || 'Verified Seller'}</strong>
                  {activeItem.seller?.city && ` (${activeItem.seller.city})`}
                </span>
                <h2>{activeItem.productName}</h2>
                <p>{activeItem.quantity} {activeItem.unit} · {activeItem.category || 'Construction Material'}</p>
              </div>
              <div className="order-tracking-item-spotlight__status">
                <span className={`order-tracking-badge order-tracking-badge--${String(activeItem.fulfillmentStatus || 'placed').toLowerCase().replace(/\s+/g, '-')}`}>
                  {activeItem.fulfillmentStatus || 'Placed'}
                </span>
              </div>
            </div>

            <div className="order-tracking-item-spotlight__details">
              <div>
                <span><MapPin size={13} /> Destination:</span>
                <strong>{activeItem.deliveryAddress || 'Address on file'} {activeItem.deliveryCity ? `· ${activeItem.deliveryCity}` : ''}</strong>
              </div>
              <div>
                <span><Truck size={13} /> Delivery Window:</span>
                <strong>{activeItem.deliveryWindow || '2–3 days'}</strong>
              </div>
              {activeItem.contactPhone && (
                <div>
                  <span><Phone size={13} /> Contact:</span>
                  <strong>{activeItem.contactPhone}</strong>
                </div>
              )}
              <div>
                <span>Payment:</span>
                <strong>{activeItem.payment?.buyerPaymentStatus || order?.paymentStatus} · Seller funds {activeItem.payment?.sellerPayoutStatus || 'Held'}</strong>
              </div>
              {activeItem.buyerNote && (
                <div className="order-tracking-item-spotlight__note">
                  <span>Buyer Delivery Note:</span>
                  <em>"{activeItem.buyerNote}"</em>
                </div>
              )}
              {(activeItem.sellerNote || activeItem.trackingLocation) && (
                <div className="order-tracking-item-spotlight__seller-note">
                  <span>Seller Tracking Note:</span>
                  <strong>{activeItem.trackingLocation ? `[${activeItem.trackingLocation}] ` : ''}{activeItem.sellerNote || 'Tracking location updated'}</strong>
                </div>
              )}
            </div>

            {/* Delivery Confirmation directly from tracking */}
            {activeItem.fulfillmentStatus === 'Delivered' && (
              <div className="order-tracking-item-spotlight__actions">
                {['BuyerConfirmed', 'AutoConfirmed'].includes(activeItem.deliveryResolution) ? (
                  <div className="order-tracking-confirmed">
                    <CheckCircle2 size={16} />
                    <span>
                      Delivery Confirmed. {activeItem.payment?.sellerPayoutStatus === 'Transferred'
                        ? 'Seller payout released.'
                        : 'Seller payout remains held until all requirements are met and the payout completes.'}
                    </span>
                  </div>
                ) : (
                  <div className="order-tracking-awaiting">
                    <p>{activeItem.deliveryResolution === 'IssueReported'
                      ? 'Automatic payment release is paused. Confirm delivery here after the WhatsApp issue is solved.'
                      : 'Delivered by seller. Confirm receipt to release payment or report on WhatsApp within 24 hours.'}</p>
                    <div className="order-tracking-awaiting__btns">
                      <button
                        type="button"
                        className="btn-tracking-confirm"
                        onClick={() => handleConfirmItem(activeItem)}
                        disabled={Boolean(actionLoading)}
                      >
                        {actionLoading === `confirm-${activeItem.id}` ? <LoaderCircle className="is-spinning" /> : <CheckCircle2 size={14} />}
                        Confirm Delivery
                      </button>
                      <button
                        type="button"
                        className="btn-tracking-report"
                        onClick={() => handleReportItem(activeItem)}
                        disabled={Boolean(actionLoading)}
                      >
                        {actionLoading === `report-${activeItem.id}` ? <LoaderCircle className="is-spinning" /> : <AlertTriangle size={14} />}
                        {actionLoading === `report-${activeItem.id}` ? 'Opening WhatsApp...' : activeItem.deliveryResolution === 'IssueReported' ? 'Open WhatsApp Again' : 'Report on WhatsApp'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Overview List of all products when viewing 'all' */}
        {!activeItem && items.length > 0 && (
          <section className="order-tracking-items-overview">
            <h2>Products in this Order ({items.length})</h2>
            <div className="order-tracking-items-grid">
              {items.map((item) => (
                <article key={item.id} className="order-tracking-item-summary-card">
                  <div className="order-tracking-item-summary-card__head">
                    <div>
                      <h3>{item.productName}</h3>
                      <small>Sold by: {item.seller?.companyName || item.seller?.name || 'Seller'}</small>
                    </div>
                    <span className={`order-tracking-badge order-tracking-badge--${String(item.fulfillmentStatus || 'placed').toLowerCase().replace(/\s+/g, '-')}`}>
                      {item.fulfillmentStatus || 'Placed'}
                    </span>
                  </div>
                  <p>{item.quantity} {item.unit} · Est: {item.deliveryWindow || '2–3 days'}</p>
                  <button
                    type="button"
                    className="order-tracking-inspect-btn"
                    onClick={() => setSearchParams(
                      { item: item.id },
                      { state: { from: `${location.pathname}${location.search}` } }
                    )}
                  >
                    View Product Timeline & Details →
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Timeline */}
        <section className="order-tracking-timeline-wrap">
          <h2>{activeItem ? `${activeItem.productName} Timeline` : 'Fulfillment Journey'}</h2>
          <TrackingTimeline events={displayEvents} />
        </section>
      </main>
    </>
  );
}
