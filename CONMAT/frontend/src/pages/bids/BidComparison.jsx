import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import RoleNavbar from '../../components/common/RoleNavbar';
import BidOfferCard from '../../components/Bids/BidOfferCard';
import {
  compareProductPrices,
  convertAcceptedBidToOrder,
  getBidDecisionMatrix,
} from '../../services/bulkBuyingService';
import { formatCurrency } from '../../utils/formatCurrency';
import './BidComparison.css';

const apiMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

export default function BidComparison() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sortBy, setSortBy] = useState('rank');
  const [error, setError] = useState('');
  const [request, setRequest] = useState(null);
  const [sourceOffers, setSourceOffers] = useState([]);
  const [comparedProducts, setComparedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const matrixResponse = await getBidDecisionMatrix(requestId);
        if (cancelled) return;
        const nextRequest = matrixResponse.request;
        const nextOffers = matrixResponse.offers || matrixResponse.data || [];
        setRequest(nextRequest || null);
        setSourceOffers(nextOffers.map((offer) => ({ ...offer, quantity: nextRequest?.requiredQuantity })));

        if (nextRequest) {
          try {
            const comparisonResponse = await compareProductPrices({
              category: nextRequest.category,
              city: nextRequest.city,
              quantity: nextRequest.requiredQuantity,
            });
            if (!cancelled) setComparedProducts(comparisonResponse.products || comparisonResponse.data || []);
          } catch {
            if (!cancelled) setComparedProducts([]);
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setRequest(null);
          setSourceOffers([]);
          setComparedProducts([]);
          setError(apiMessage(loadError, 'Unable to load this bid request.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [requestId]);

  const offers = useMemo(() => {
    const sorted = [...sourceOffers];
    if (sortBy === 'price') sorted.sort((a, b) => Number(a.bidAmount) - Number(b.bidAmount));
    if (sortBy === 'delivery') sorted.sort((a, b) => Number(a.deliveryDays) - Number(b.deliveryDays));
    if (sortBy === 'rank') sorted.sort((a, b) => Number(a.rank || 999) - Number(b.rank || 999));
    return sorted;
  }, [sourceOffers, sortBy]);

  const handleAcceptOffer = async (offer) => {
    if (accepting) return;
    setAccepting(true);
    setError('');
    try {
      const shippingAddress = [user?.street, user?.city, user?.postalCode].filter(Boolean).join(', ')
        || request?.deliveryAddress
        || request?.city;
      const response = await convertAcceptedBidToOrder(offer.id, {
        shippingAddress,
        contactPhone: user?.phone || undefined,
      });
      const acceptanceMessage = `${offer.supplierName || offer.sellerName || 'Seller'} offer accepted and converted to order ${response.order?.orderNumber || response.orderId || ''}.`;
      navigate('/bids?view=requests&status=Closed', {
        replace: true,
        state: { bidAcceptanceMessage: acceptanceMessage },
      });
    } catch (acceptError) {
      setError(apiMessage(acceptError, 'Unable to accept and convert this bid.'));
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return <><RoleNavbar /><main className="bid-comparison-page"><p>Loading bid comparison...</p></main></>;
  }

  if (!request) {
    return (
      <>
        <RoleNavbar />
        <main className="bid-comparison-page">
          <div className="bid-comparison-actions"><button type="button" onClick={() => navigate(-1)}><ArrowLeft size={16} />Back</button></div>
          <section className="bid-comparison-empty" role="status">
            <span>Bid request not found</span>
            <h1>This bulk request is unavailable.</h1>
            <p>{error || 'It may have been removed, completed, or the link may be incorrect.'}</p>
            <div><Link to="/bids?view=requests" className="btn btn-orange-cta text-white">My Bulk Requests</Link></div>
          </section>
        </main>
      </>
    );
  }

  const bestPrice = offers.length ? Math.min(...offers.map((offer) => Number(offer.bidAmount))) : 0;
  const fastest = offers.length ? Math.min(...offers.map((offer) => Number(offer.deliveryDays))) : 0;
  const potentialSaving = request.targetPrice
    ? (Number(request.targetPrice) - bestPrice) * Number(request.requiredQuantity)
    : 0;

  return (
    <>
      <RoleNavbar />
      <main className="bid-comparison-page conmat-page-shell">
        <section className="bid-comparison-hero conmat-page-hero">
          <div>
            <span>Bid Comparison</span>
            <h1>{request.title}</h1>
            <p>{request.city} · {request.requiredQuantity} {request.unit}{request.targetPrice ? ` · Target ${formatCurrency(request.targetPrice)} per ${request.unit}` : ''}</p>
          </div>
        </section>

        <div className="bid-comparison-actions"><button type="button" onClick={() => navigate(-1)}><ArrowLeft size={16} />Back</button></div>
        {error && <p className="bid-comparison-message">{error}</p>}

        <section className="bid-comparison-stats">
          <article><span>Best Unit Price</span><strong>{bestPrice ? formatCurrency(bestPrice) : '—'}</strong><small>Lowest seller offer</small></article>
          <article><span>Fastest Delivery</span><strong>{fastest ? `${fastest} days` : '—'}</strong><small>Fastest available offer</small></article>
          <article><span>Potential Saving</span><strong>{request.targetPrice && bestPrice ? formatCurrency(Math.max(potentialSaving, 0)) : '—'}</strong><small>Against target price</small></article>
          <article><span>Total Offers</span><strong>{offers.length}</strong><small>Submitted seller offers</small></article>
        </section>

        <section className="bid-comparison-toolbar">
          <div><span>Seller Offers</span><h2>Compare and choose the best bid</h2></div>
          <select className="conmat-filter-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="rank">Sort by recommended rank</option>
            <option value="price">Sort by lowest price</option>
            <option value="delivery">Sort by fastest delivery</option>
          </select>
        </section>

        <section className="bid-comparison-offers">
          {offers.length ? offers.map((offer) => (
            <BidOfferCard key={offer.id} offer={offer} isSelected={offer.status === 'Accepted'} onAccept={accepting ? null : handleAcceptOffer} />
          )) : <p>No bids have been submitted for this request yet.</p>}
        </section>

        <section className="bid-comparison-grid">
          <div className="bid-comparison-panel">
            <div className="bid-comparison-panel__head"><span>Request Summary</span><h2>Procurement terms</h2></div>
            <div className="bid-comparison-products">
              <article><div><h3>Quantity</h3><p>{request.requiredQuantity} {request.unit}</p></div><strong>{request.targetPrice ? `${formatCurrency(request.targetPrice)}/${request.unit}` : 'Open target'}</strong></article>
              <article><div><h3>Delivery location</h3><p>{request.deliveryAddress || request.city}</p></div><strong>{request.requestStatus}</strong></article>
              {request.expiresAt && <article><div><h3>Request deadline</h3><p>{new Date(request.expiresAt).toLocaleDateString()}</p></div><strong>Deadline</strong></article>}
            </div>
          </div>

          <div className="bid-comparison-panel">
            <div className="bid-comparison-panel__head"><span>Product Comparison</span><h2>Similar verified listings</h2></div>
            <div className="bid-comparison-products">
              {comparedProducts.length ? comparedProducts.slice(0, 6).map((product) => (
                <article key={product.id}>
                  <div><h3>{product.name}</h3><p>{product.sellerName} · {product.city || 'Marketplace'} · {product.stock} in stock</p></div>
                  <strong>{formatCurrency(product.unitPrice)}</strong>
                </article>
              )) : <p>No comparable live listings are available for this category and city.</p>}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
