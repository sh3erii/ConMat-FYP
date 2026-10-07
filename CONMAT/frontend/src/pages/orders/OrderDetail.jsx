import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, CreditCard, LoaderCircle, MapPin, Package, Phone, Truck, XCircle } from 'lucide-react';
import OrderTimeline from '../../components/common/OrderTimeline';
import RoleNavbar from '../../components/common/RoleNavbar';
import { useCart } from '../../context/CartContext';
import {
  cancelOrder,
  confirmOrderDelivery,
  confirmItemDelivery,
  getOrderDetail,
  reportOrderIssue,
  reportItemIssue,
} from '../../services/orderService';
import { formatCurrency } from '../../utils/formatCurrency';
import getApiAssetUrl from '../../utils/getApiAssetUrl';
import { canCancelBuyerOrder, canProceedToOrderPayment } from '../../utils/orderActions';
import { whatsappDeliverySupportUrl } from '../../utils/whatsappSupport';
import './OrderDetail.css';

export default function OrderDetail() {
  const { orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [prevOrderId, setPrevOrderId] = useState(orderId);
  const [order, setOrder] = useState(undefined);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState(false);

  if (orderId !== prevOrderId) {
    setPrevOrderId(orderId);
    setOrder(undefined);
    setError('');
  }

  useEffect(() => {
    let active = true;
    getOrderDetail(orderId)
      .then((response) => {
        if (active) setOrder(response?.order || response?.data || null);
      })
      .catch((err) => {
        if (!active) return;
        setOrder(null);
        setError(err.response?.data?.message || 'Unable to load this order.');
      });
    return () => { active = false; };
  }, [orderId]);

  const handleConfirmItemDelivery = async (item) => {
    const itemName = item.productName || item.name || 'this product';
    const sellerName = item.seller?.companyName || item.seller?.name || 'the seller';
    if (!window.confirm(`Confirm receipt of "${itemName}" from ${sellerName}? Their payout can be released once all of their products in this order are confirmed.`)) return;
    const note = window.prompt('Optional confirmation note for the seller:', '') ?? null;
    if (note === null) return;
    setActionLoading(`confirm-${item.id}`);
    setActionMessage('');
    try {
      const response = await confirmItemDelivery(order.id, item.id, note);
      setOrder(response.order);
      setActionError(false);
      setActionMessage(response.message || `Delivery confirmed for ${itemName}.`);
    } catch (err) {
      setActionError(true);
      setActionMessage(err.response?.data?.message || `Unable to confirm delivery for ${itemName}.`);
    } finally {
      setActionLoading('');
    }
  };

  const handleReportItemIssue = async (item) => {
    const itemName = item.productName || item.name || 'this product';
    const whatsappUrl = whatsappDeliverySupportUrl({ orderNumber: order.orderNumber, productName: itemName });
    if (item.deliveryResolution === 'IssueReported') {
      window.location.assign(whatsappUrl);
      return;
    }
    setActionLoading(`report-${item.id}`);
    setActionMessage('');
    try {
      const response = await reportItemIssue(order.id, item.id, {
        reason: 'WhatsApp support requested',
        details: 'Buyer opened ConMat WhatsApp support for this delivery.',
      });
      setOrder(response.order);
      setActionError(false);
      window.location.assign(whatsappUrl);
    } catch (err) {
      setActionError(true);
      setActionMessage(err.response?.data?.message || `Unable to pause payment release before opening WhatsApp for ${itemName}.`);
    } finally {
      setActionLoading('');
    }
  };

  const handleConfirmDelivery = async () => {
    if (!window.confirm('Confirm that this order was delivered successfully?')) return;
    const note = window.prompt('Optional confirmation note for the seller:', '') ?? null;
    if (note === null) return;
    setActionLoading('confirm');
    setActionMessage('');
    try {
      const response = await confirmOrderDelivery(order.id, note);
      setOrder(response.order);
      setActionError(false);
      setActionMessage(response.message || 'Delivery confirmed and sellers were notified.');
    } catch (err) {
      setActionError(true);
      setActionMessage(err.response?.data?.message || 'Unable to confirm delivery.');
    } finally {
      setActionLoading('');
    }
  };

  const handleReportIssue = async () => {
    const whatsappUrl = whatsappDeliverySupportUrl({ orderNumber: order.orderNumber });
    if (order.issueReported) {
      window.location.assign(whatsappUrl);
      return;
    }
    setActionLoading('report');
    setActionMessage('');
    try {
      const response = await reportOrderIssue(order.id, {
        reason: 'WhatsApp support requested',
        details: 'Buyer opened ConMat WhatsApp support for this delivery.',
      });
      setOrder(response.order);
      setActionError(false);
      window.location.assign(whatsappUrl);
    } catch (err) {
      setActionError(true);
      setActionMessage(err.response?.data?.message || 'Unable to pause payment release before opening WhatsApp.');
    } finally {
      setActionLoading('');
    }
  };

  const handleCancelOrder = async () => {
    if (!canCancelBuyerOrder(order)) return;
    if (!window.confirm(`Cancel order ${order.orderNumber}? Reserved stock will be returned to the sellers.`)) return;
    const reason = window.prompt('Reason for cancellation (optional):', '') ?? null;
    if (reason === null) return;
    setActionLoading('cancel');
    setActionMessage('');
    setActionError(false);
    try {
      const response = await cancelOrder(order.id, reason.trim());
      clearCart();
      navigate('/orders', {
        replace: true,
        state: { orderMessage: response.message || `Order ${order.orderNumber} was cancelled.` },
      });
    } catch (err) {
      setActionError(true);
      setActionMessage(err.response?.data?.message || 'Unable to cancel this order.');
    } finally {
      setActionLoading('');
    }
  };

  if (order === undefined) {
    return <><RoleNavbar /><main className="order-detail-page"><section className="order-detail-empty"><p>Loading order...</p></section></main></>;
  }

  if (!order) {
    return (
      <><RoleNavbar /><main className="order-detail-page"><div className="order-detail-actions"><Link to="/orders"><ArrowLeft />Back</Link></div><section className="order-detail-empty" role="status"><Package size={42} /><span>Order not found</span><h1>We could not find order {orderId || 'requested'}.</h1><p>{error || 'The order is not available for this account.'}</p><Link to="/orders">Return to orders</Link></section></main></>
    );
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const subtotal = Number(order.subtotal ?? items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || item.price || 0), 0));
  const discount = Number(order.discount || 0);
  const deliveryFee = Number(order.deliveryFee ?? order.shippingFee ?? 0);
  const total = Number(order.total ?? order.totalAmount ?? subtotal + deliveryFee);
  const paymentStatus = String(order.paymentStatus || 'Pending').toUpperCase();
  const fundsStatus = String(order.fundsStatus || (paymentStatus === 'PAID' ? 'Held' : 'NotFunded'));
  const commissionPercent = order.payouts?.length
    ? Number((Number(order.payouts[0].commissionRate) * 100).toFixed(2))
    : 1;
  const fundsLabel = {
    NotFunded: 'Awaiting buyer payment',
    Held: 'Held securely by ConMat',
    PartiallyReleased: 'Partially released to sellers',
    Released: 'Released to sellers',
    ReleaseFailed: 'Release requires attention',
  }[fundsStatus] || fundsStatus;
  const displayStatus = String(order.fulfillmentStatus || order.orderStatus || order.status || 'Placed').toUpperCase();
  const deliveryAddress = order.address || order.deliveryAddress || order.shippingAddress || `${order.city || 'Pakistan'}`;
  const deliveryConfirmed = Boolean(order.deliveryConfirmed);
  const issueReported = Boolean(order.issueReported);
  const deliveryResolution = String(order.deliveryResolution || 'AwaitingBuyer');
  const releaseFailed = deliveryResolution === 'ReleaseFailed' || fundsStatus === 'ReleaseFailed';
  const responseDeadline = order.deliveryResponseDeadline ? new Date(order.deliveryResponseDeadline) : null;
  const canPay = canProceedToOrderPayment(order);
  const canCancel = canCancelBuyerOrder(order);
  const paymentActionLabel = paymentStatus === 'FAILED' ? 'Retry Payment' : 'Proceed to Payment';

  return (
    <>
      <RoleNavbar />
      <main className="order-detail-page conmat-page-shell">
        <section className="order-detail-hero conmat-page-hero">
          <div><span>Order Detail</span><h1>{order.orderNumber}</h1><p>{order.supplier || order.supplierName || 'ConMat Seller'} · {order.city || 'Pakistan'}</p></div>
          <div className="order-detail-hero__status"><strong>{displayStatus}</strong><small>{paymentStatus}</small></div>
        </section>
        <div className="order-detail-actions">
          <Link to="/orders"><ArrowLeft />Back</Link>
          {canPay && <Link className="order-detail-actions__pay" to={`/payments/checkout/${order.id}`}><CreditCard />{paymentActionLabel}</Link>}
          {canCancel && (
            <button type="button" className="order-detail-actions__cancel" onClick={handleCancelOrder} disabled={Boolean(actionLoading)}>
              {actionLoading === 'cancel' ? <LoaderCircle className="order-detail-action-spinner" /> : <XCircle />}
              {actionLoading === 'cancel' ? 'Cancelling...' : 'Cancel Order'}
            </button>
          )}
        </div>
        {actionMessage && <p className={actionError ? 'order-detail-order-message is-error' : 'order-detail-order-message'} role="status">{actionMessage}</p>}

        {/* Overall Confirmation Banner when all items are delivered or general order delivery */}
        {displayStatus === 'DELIVERED' && (
          <section className="order-detail-confirmation">
            <div className="order-detail-confirmation__content">
              <div className="order-detail-confirmation__icon">
                {issueReported ? <AlertTriangle /> : <CheckCircle2 />}
              </div>
              <div>
                <h2>{deliveryConfirmed ? 'All deliveries confirmed' : issueReported ? 'WhatsApp support requested' : releaseFailed ? 'Payout release needs attention' : 'Confirm your deliveries'}</h2>
                <p>
                  {deliveryConfirmed
                    ? fundsStatus === 'Released'
                      ? order.deliveryConfirmationType === 'automatic'
                        ? `No issues were reported within 24 hours. All seller proceeds were released automatically after ConMat deducted its ${commissionPercent}% commission.`
                        : `You confirmed receipt of all products. All seller proceeds were released after ConMat deducted its ${commissionPercent}% commission.`
                      : 'Receipt of every product is confirmed. Any seller payment still shown as held remains protected until its payout finishes.'
                    : issueReported
                      ? 'Automatic payment release is paused. Contact ConMat on WhatsApp, then confirm delivery here after the problem is solved.'
                      : releaseFailed
                        ? 'The payment is protected in ConMat Escrow. You can retry confirmation or contact support.'
                        : `All products have arrived. Confirm receipt below or report on WhatsApp${responseDeadline ? ` before ${responseDeadline.toLocaleString()}` : ''}. You can also confirm or contact WhatsApp support for individual products below.`}
                </p>
              </div>
            </div>
            {!deliveryConfirmed && items.length === 1 && (
              <div className="order-detail-confirmation__actions">
                <button type="button" className="order-detail-confirm-btn" onClick={handleConfirmDelivery} disabled={Boolean(actionLoading)}>
                  {actionLoading === 'confirm' ? <LoaderCircle className="order-detail-action-spinner" /> : <CheckCircle2 />}
                  {actionLoading === 'confirm' ? 'Confirming...' : 'Confirm Delivery'}
                </button>
                {!releaseFailed && (
                  <button type="button" className="order-detail-report-btn" onClick={handleReportIssue} disabled={Boolean(actionLoading)}>
                    {actionLoading === 'report' ? <LoaderCircle className="order-detail-action-spinner" /> : <AlertTriangle />}
                    {actionLoading === 'report' ? 'Opening WhatsApp...' : issueReported ? 'Open WhatsApp Again' : 'Report on WhatsApp'}
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {displayStatus === 'PARTIALLY DELIVERED' && (
          <section className="order-detail-partial-banner">
            <div className="order-detail-partial-banner__content">
              <Clock size={20} />
              <div>
                <strong>Partially Delivered Order</strong>
                <p>Some items have arrived from their sellers, while others are still in fulfillment. You can inspect and confirm receipt of each delivered product below to release that seller’s payout.</p>
              </div>
            </div>
          </section>
        )}

        <section className="order-detail-grid">
          <div className="order-detail-panel order-detail-panel--wide">
            <div className="order-detail-panel__head">
              <div>
                <span>Materials & Sellers</span>
                <h2>Product fulfillment ({items.length} {items.length === 1 ? 'item' : 'items'})</h2>
              </div>
            </div>

            <div className="order-detail-items">
              {items.map((item) => {
                const itemDelivered = item.fulfillmentStatus === 'Delivered';
                const itemResolution = item.deliveryResolution;
                const isConfirmed = ['BuyerConfirmed', 'AutoConfirmed'].includes(itemResolution);
                const isReported = itemResolution === 'IssueReported';
                return (
                  <article className="order-detail-item-card" key={item.id}>
                    <div className="order-detail-item-card__header">
                      <div className="order-detail-item-card__media">
                        {item.image ? (
                          <img src={getApiAssetUrl(item.image)} alt={item.name || item.productName} />
                        ) : (
                          <div className="order-detail-item__placeholder" aria-hidden="true">
                            <Package size={28} />
                          </div>
                        )}
                        <div className="order-detail-item-card__title-area">
                          <h3>{item.name || item.productName}</h3>
                          <p className="order-detail-item-card__category">{item.category || 'Construction Material'} · {item.quantity} {item.unit}</p>
                          <div className="order-detail-item-card__seller-info">
                            <span className="order-detail-seller-badge">
                              Seller: <strong>{item.seller?.companyName || item.seller?.name || 'Verified Seller'}</strong>
                              {item.seller?.city ? ` (${item.seller.city})` : ''}
                            </span>
                            <span className="order-detail-unit-pricing">
                              {formatCurrency(Number(item.unitPrice || 0))} / {item.unit}
                              {Number(item.deliveryCharge || 0) > 0 ? ` + ${formatCurrency(item.deliveryCharge)} delivery` : ' (Free delivery)'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="order-detail-item-card__pricing">
                        <strong>{formatCurrency(Number(item.itemTotal || (Number(item.quantity || 0) * Number(item.unitPrice || 0) + Number(item.deliveryCharge || 0))))}</strong>
                        <span className={`order-detail-item-status order-detail-item-status--${String(item.fulfillmentStatus || 'placed').toLowerCase().replace(/\s+/g, '-')}`}>
                          {item.fulfillmentStatus || order.orderStatus || 'Placed'}
                        </span>
                      </div>
                    </div>

                    {/* Item delivery details and notes */}
                    <div className="order-detail-item-card__delivery-details">
                      <div className="order-detail-item-detail-row">
                        <span><MapPin size={13} /> Destination:</span>
                        <strong>{item.deliveryAddress || order.shippingAddress || 'Address on file'} {item.deliveryCity ? `· ${item.deliveryCity}` : ''}</strong>
                      </div>
                      <div className="order-detail-item-detail-row">
                        <span><Truck size={13} /> Estimated:</span>
                        <strong>{item.deliveryWindow || '2–3 days'}</strong>
                      </div>
                      {item.contactPhone && (
                        <div className="order-detail-item-detail-row">
                          <span><Phone size={13} /> Contact:</span>
                          <strong>{item.contactPhone}</strong>
                        </div>
                      )}
                      <div className="order-detail-item-detail-row">
                        <span><CreditCard size={13} /> Payment:</span>
                        <strong>
                          {item.payment?.buyerPaymentStatus || order.paymentStatus} · Seller funds {item.payment?.sellerPayoutStatus || 'Held'}
                        </strong>
                      </div>
                      {item.buyerNote && (
                        <div className="order-detail-item-detail-row order-detail-item-detail-row--note">
                          <span>Delivery Note:</span>
                          <em>"{item.buyerNote}"</em>
                        </div>
                      )}
                      {(item.sellerNote || item.trackingLocation) && (
                        <div className="order-detail-item-detail-row order-detail-item-detail-row--seller-note">
                          <span>Seller Update:</span>
                          <strong>{item.trackingLocation ? `[${item.trackingLocation}] ` : ''}{item.sellerNote || 'Tracking location updated'}</strong>
                        </div>
                      )}
                    </div>

                    {/* Item-specific fulfillment actions & resolution */}
                    {itemDelivered ? (
                      <div className="order-detail-item-card__fulfillment-action">
                        {isConfirmed ? (
                          <div className="order-detail-item-confirmed">
                            <CheckCircle2 size={16} />
                            <span>
                              {itemResolution === 'AutoConfirmed'
                                ? 'Automatically confirmed after 24 hours.'
                                : 'You confirmed receipt of this product.'}
                              {' '}{item.payment?.sellerPayoutStatus === 'Transferred'
                                ? 'Seller proceeds were released.'
                                : 'Seller proceeds remain held until all requirements are met and the payout completes.'}
                            </span>
                          </div>
                        ) : (
                          <div className="order-detail-item-awaiting">
                            <div className="order-detail-item-awaiting__text">
                              <strong>Marked Delivered by {item.seller?.companyName || item.seller?.name || 'Seller'}</strong>
                              <p>
                                {isReported
                                  ? 'Automatic payment release is paused. Confirm receipt here after WhatsApp support resolves the problem.'
                                  : `Verify your items. Confirm receipt to release seller funds, or report on WhatsApp${item.deliveryResponseDeadline ? ` before ${new Date(item.deliveryResponseDeadline).toLocaleString()}` : ''}.`}
                              </p>
                            </div>
                            <div className="order-detail-item-awaiting__buttons">
                              <button
                                type="button"
                                className="order-detail-item-confirm-btn"
                                onClick={() => handleConfirmItemDelivery(item)}
                                disabled={Boolean(actionLoading)}
                              >
                                {actionLoading === `confirm-${item.id}` ? <LoaderCircle className="order-detail-action-spinner" /> : <CheckCircle2 size={14} />}
                                Confirm Receipt
                              </button>
                              <button
                                type="button"
                                className="order-detail-item-report-btn"
                                onClick={() => handleReportItemIssue(item)}
                                disabled={Boolean(actionLoading)}
                              >
                                {actionLoading === `report-${item.id}` ? <LoaderCircle className="order-detail-action-spinner" /> : <AlertTriangle size={14} />}
                                {actionLoading === `report-${item.id}` ? 'Opening WhatsApp...' : isReported ? 'Open WhatsApp Again' : 'Report on WhatsApp'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="order-detail-item-card__in-progress">
                        <span>Fulfillment: <strong>{item.fulfillmentStatus || 'In Progress'}</strong> by {item.seller?.companyName || item.seller?.name || 'Seller'}</span>
                        <Link
                          to={`/orders/${order.id}/tracking?item=${encodeURIComponent(item.id)}`}
                          state={{ from: `${location.pathname}${location.search}` }}
                          className="order-detail-item-track-link"
                        >
                          <Truck size={13} /> Track Product
                        </Link>
                      </div>
                    )}
                  </article>
                );
              })}
              {!items.length && <p>No line items are available for this order.</p>}
            </div>
          </div>

          <aside className="order-detail-panel">
            <div className="order-detail-panel__head"><div><span>Invoice</span><h2>Payment summary</h2></div></div>
            <div className="order-detail-totals">
              <p><span>Subtotal</span><strong>{formatCurrency(subtotal)}</strong></p>
              {discount > 0 && <p><span>Wholesale Discount</span><strong>-{formatCurrency(discount)}</strong></p>}
              <p><span>Delivery</span><strong>{deliveryFee === 0 ? 'Free' : formatCurrency(deliveryFee)}</strong></p>
              <p><span>Seller funds</span><strong>{fundsLabel}</strong></p>
              <p className="order-detail-totals__total"><span>Total</span><strong>{formatCurrency(total)}</strong></p>
            </div>
            {order.invoiceId
              ? <Link className="order-detail-invoice-btn" to={`/invoices/${order.invoiceId}`}>Open printable invoice</Link>
              : paymentStatus === 'PAID'
                ? <Link className="order-detail-invoice-btn" to="/invoices">View invoices</Link>
                : <p className="order-detail-payment-state">{canPay ? 'Payment is pending. Use Proceed to Payment above.' : 'Payment is unavailable for this cancelled order.'}</p>}
          </aside>
        </section>

        <section className="order-detail-grid order-detail-grid--bottom">
          <div className="order-detail-panel order-detail-panel--wide">
            <div className="order-detail-panel__head"><div><span>Progress</span><h2>Status timeline</h2></div></div>
            <OrderTimeline steps={Array.isArray(order.timeline) ? order.timeline : []} />
          </div>
          <aside className="order-detail-panel">
            <div className="order-detail-panel__head"><div><span>Delivery</span><h2>Shipping details</h2></div></div>
            <div className="order-detail-shipping">
              <p><span>City</span><strong>{order.city || '—'}</strong></p>
              <p><span>Address</span><strong>{deliveryAddress}</strong></p>
              {items.length ? items.map((item) => (
                <p key={item.id || item.productId}>
                  <span>{item.name || item.productName} delivery</span>
                  <strong>{item.deliveryWindow || '2–3 days'}</strong>
                </p>
              )) : (
                <p><span>Delivery window</span><strong>{order.deliveryWindow || order.deliveryDate || '—'}</strong></p>
              )}
              <p><span>Supplier</span><strong>{order.supplier || order.supplierName || 'ConMat Seller'}</strong></p>
            </div>
          </aside>
        </section>
      </main>
    </>
  );
}
