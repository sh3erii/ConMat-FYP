import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import RoleNavbar from '../../components/common/RoleNavbar';
import { useAuth } from '../../context/AuthContext';
import {
  getMyBidOffers,
  getMyBulkRequests,
  getMySellerProducts,
  getOpenBulkRequests,
  submitBidOffer,
} from '../../services/bulkBuyingService';
import { formatCurrency } from '../../utils/formatCurrency';
import './SupplierBidsPage.css';

const emptyForm = { requestId: '', productId: '', amount: '', deliveryDays: '', notes: '' };

const normalized = (value) => String(value || '').trim().toLowerCase();

const effectiveRequestStatus = (request, now = Date.now()) => {
  const storedStatus = request.requestStatus || request.status || 'Open';
  if (storedStatus !== 'Open') return storedStatus;
  if (request.acceptedOfferId) return 'Closed';
  if (request.expiresAt && new Date(request.expiresAt).getTime() <= now) return 'Expired';
  return 'Open';
};

const isOpenBidOpportunity = (request, now = Date.now()) => (
  effectiveRequestStatus(request, now) === 'Open'
);

const productMatchesRequest = (product, request) => (
  Boolean(product)
  && (!request?.category || normalized(product.category) === normalized(request.category))
  && normalized(product.unit) === normalized(request?.unit)
);

const productCanFulfilRequest = (product, request) => (
  productMatchesRequest(product, request)
  && product.status === 'Active'
  && Number(product.stock) >= Number(request?.requiredQuantity || 0)
);

const normalizeRequest = (request) => {
  return {
    ...request,
    status: effectiveRequestStatus(request),
    offers: Number(request.offersCount ?? request.offers ?? 0),
  };
};

const apiMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;
const requestStatuses = ['Open', 'Closed', 'Expired'];
const statusFromSearch = (search) => {
  const requestedStatus = new URLSearchParams(search).get('status');
  return requestStatuses.includes(requestedStatus) ? requestedStatus : null;
};

export default function SupplierBidsPage({
  embedded = false,
  observer = false,
  readOnly = false,
  eyebrow = 'Supplier Workspace',
  title = 'Bulk Bidding Requests',
  description = 'Bid on active procurement requests from customers, retailers and wholesalers across the marketplace.',
}) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const showBackButton = !embedded && normalized(user?.role) === 'wholesaler';
  const activeTab = statusFromSearch(location.search) || 'Open';
  const [bids, setBids] = useState([]);
  const [myOffers, setMyOffers] = useState([]);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [bidForm, setBidForm] = useState(emptyForm);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    let mounted = true;
    let hasLoaded = false;
    const fetchData = async () => {
      try {
        if (readOnly) {
          const response = await getMyBulkRequests();
          if (!mounted) return;
          const rows = response.requests || response.bidRequests || response.data || [];
          setBids(rows.map(normalizeRequest));
          setMyOffers([]);
        } else if (observer) {
          const response = await getOpenBulkRequests({ includeHistory: true });
          if (!mounted) return;
          const rows = response.requests || response.data || [];
          setBids(rows.map(normalizeRequest));
          setMyOffers([]);
          setSellerProducts([]);
        } else {
          const [requestsResponse, offersResponse, productsResponse] = await Promise.all([
            getOpenBulkRequests(),
            getMyBidOffers(),
            getMySellerProducts(),
          ]);
          if (!mounted) return;
          const rows = requestsResponse.requests || requestsResponse.data || [];
          setBids(rows.map(normalizeRequest));
          setMyOffers(offersResponse.offers || offersResponse.data || []);
          setSellerProducts(productsResponse.products || productsResponse.data || []);
        }
      } catch (requestError) {
        if (!mounted) return;
        if (!hasLoaded) {
          setBids([]);
          setMyOffers([]);
          setSellerProducts([]);
          setError(apiMessage(requestError, 'Unable to load bulk bidding data.'));
        }
      } finally {
        if (mounted) {
          hasLoaded = true;
          setLoading(false);
        }
      }
    };

    fetchData();
    const refreshTimer = window.setInterval(fetchData, 15000);
    return () => {
      mounted = false;
      window.clearInterval(refreshTimer);
    };
  }, [observer, readOnly]);

  useEffect(() => {
    const expiryTimer = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(expiryTimer);
  }, []);

  const offerByRequest = useMemo(
    () => Object.fromEntries(myOffers.map((offer) => [offer.bidRequestId, offer])),
    [myOffers]
  );

  const visibleBids = useMemo(
    () => bids.filter((request) => effectiveRequestStatus(request, currentTime) === activeTab),
    [bids, activeTab, currentTime]
  );

  const selectedRequest = useMemo(
    () => bids.find((request) => (
      request.id === bidForm.requestId
      && (readOnly || isOpenBidOpportunity(request, currentTime))
    )) || null,
    [bids, bidForm.requestId, currentTime, readOnly]
  );

  const matchingProducts = useMemo(
    () => sellerProducts.filter((product) => productMatchesRequest(product, selectedRequest)),
    [sellerProducts, selectedRequest]
  );

  const eligibleProducts = useMemo(
    () => matchingProducts.filter((product) => productCanFulfilRequest(product, selectedRequest)),
    [matchingProducts, selectedRequest]
  );

  const selectedProduct = useMemo(
    () => sellerProducts.find((product) => product.id === bidForm.productId) || null,
    [sellerProducts, bidForm.productId]
  );

  const handlePlaceBid = (requestId) => {
    const request = bids.find((item) => item.id === requestId);
    if (!request) return;
    const existing = offerByRequest[requestId];
    const existingProduct = sellerProducts.find((product) => product.id === existing?.productId);
    const fallbackProduct = sellerProducts.find((product) => productCanFulfilRequest(product, request));

    setBidForm({
      requestId,
      productId: productCanFulfilRequest(existingProduct, request)
        ? existingProduct.id
        : fallbackProduct?.id || '',
      amount: existing?.bidAmount ?? request.targetPrice ?? '',
      deliveryDays: existing?.deliveryDays ?? 3,
      notes: existing?.notes ?? '',
    });
    setSuccessMsg('');
    setError('');
  };

  const handleBack = () => {
    if (location.key !== 'default') {
      navigate(-1);
      return;
    }
    navigate('/dashboard');
  };

  const handleStatusChange = (event) => {
    const params = new URLSearchParams(location.search);
    params.set('status', event.target.value);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  const handleSubmitBid = async (event) => {
    event.preventDefault();
    if (readOnly || !bidForm.requestId || Number(bidForm.amount) <= 0 || Number(bidForm.deliveryDays) <= 0) return;
    if (!selectedProduct || !productCanFulfilRequest(selectedProduct, selectedRequest)) {
      setError('Select an active matching product with enough inventory for the requested quantity.');
      return;
    }

    setSubmitting(true);
    setSuccessMsg('');
    setError('');
    try {
      const response = await submitBidOffer({
        bidRequestId: bidForm.requestId,
        productId: selectedProduct.id,
        bidAmount: Number(bidForm.amount),
        deliveryDays: Number(bidForm.deliveryDays),
        notes: bidForm.notes,
      });
      const offer = response.offer;
      if (offer) {
        setMyOffers((current) => {
          const without = current.filter((item) => item.bidRequestId !== offer.bidRequestId);
          return [offer, ...without];
        });
      }
      const owner = selectedRequest?.requesterName || `${selectedRequest?.requesterRole || 'buyer'} account`;
      setSuccessMsg(`Bid of ${formatCurrency(bidForm.amount)} per unit saved using ${selectedProduct.name} for ${owner}.`);
      setBidForm(emptyForm);
    } catch (submitError) {
      const message = apiMessage(submitError, 'Unable to submit the bid.');
      const opportunityClosed = [404, 409].includes(submitError?.response?.status)
        && /expired|no longer accepting bids|bulk request not found/i.test(message);
      if (opportunityClosed) {
        setBids((current) => current.filter((request) => request.id !== bidForm.requestId));
        setBidForm(emptyForm);
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
      <main className="supplier-bids-page workspace-page">
        <header className="supplier-bids-header conmat-page-hero">
          <span className="supplier-bids-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </header>

        {(successMsg || location.state?.bidAcceptanceMessage) && (
          <div className="alert alert-success">{successMsg || location.state.bidAcceptanceMessage}</div>
        )}
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="supplier-bids-toolbar">
          {showBackButton && (
            <button type="button" className="supplier-bids-back" onClick={handleBack}>
              <ArrowLeft size={17} aria-hidden="true" />
              <span>Back</span>
            </button>
          )}

          <label className="supplier-bids-status-filter">
            <span>Request status</span>
            <select className="conmat-filter-select" value={activeTab} onChange={handleStatusChange}>
              {requestStatuses.map((status) => (
                <option key={status} value={status}>{status} Requests</option>
              ))}
            </select>
          </label>
        </div>

        <div className="row g-4 supplier-bids-content">
          <div className={readOnly || observer || !bidForm.requestId ? 'col-12' : 'col-lg-8'}>
            <div className="card supplier-bids-table-card shadow-sm border-0 rounded-4 overflow-hidden">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th className="px-4 py-3">Material Request</th>
                      <th className="py-3">Quantity</th>
                      <th className="py-3">Target Price</th>
                      <th className="py-3">{readOnly ? 'Total Bids' : observer ? 'Participants' : 'My Bid'}</th>
                      <th className="px-4 py-3 text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td className="px-4 py-4" colSpan="5">Loading bidding requests...</td></tr>
                    ) : visibleBids.length === 0 ? (
                      <tr><td className="px-4 py-4 text-muted" colSpan="5">No {activeTab.toLowerCase()} requests found.</td></tr>
                    ) : visibleBids.map((request) => {
                      const existingOffer = offerByRequest[request.id];
                      return (
                        <tr key={request.id}>
                          <td className="px-4 py-3">
                            <h3 className="fs-6 fw-bold mb-0">{request.title}</h3>
                            <small>{request.city} · Category: {request.category || 'General'}</small>
                            {!readOnly && (
                              <small className="bid-request-owner">
                                Requested by {request.requesterName || `${request.requesterRole} buyer`}
                                {' '}· {request.requesterRole} · Ref {request.requestReference || String(request.id).slice(0, 8).toUpperCase()}
                              </small>
                            )}
                          </td>
                          <td className="py-3 fw-bold">{request.requiredQuantity} {request.unit}</td>
                          <td className="py-3 target-price">{request.targetPrice ? `${formatCurrency(request.targetPrice)}/${request.unit}` : 'Open pricing'}</td>
                          <td className="py-3">
                            <span className={`badge${observer ? ' bid-participant-list' : ''}`}>
                              {readOnly
                                ? `${request.offers} bids`
                                : observer
                                  ? request.participants?.length
                                    ? request.participants.map((participant) => participant.name).join(', ')
                                    : 'No participants yet'
                                  : existingOffer
                                    ? `${formatCurrency(existingOffer.bidAmount)} · ${existingOffer.status}`
                                    : 'Not submitted'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-end">
                            {readOnly ? (
                              <Link className="btn btn-sm btn-outline-secondary fw-bold" to={`/bids/compare/${request.id}`}>Compare Bids</Link>
                            ) : observer ? (
                              isOpenBidOpportunity(request, currentTime) ? (
                                <Link className="btn btn-sm btn-orange-cta bid-now-btn" to="/bids/participation-not-allowed">Participate</Link>
                              ) : (
                                <span className="text-muted small fw-bold">{effectiveRequestStatus(request, currentTime)}</span>
                              )
                            ) : isOpenBidOpportunity(request, currentTime) ? (
                              <button type="button" className="btn btn-sm btn-orange-cta bid-now-btn" onClick={() => handlePlaceBid(request.id)}>
                                {existingOffer ? 'Update Bid' : 'Bid Now'}
                              </button>
                            ) : (
                              <span className="text-muted small fw-bold">Closed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {!readOnly && !observer && bidForm.requestId && selectedRequest && (
            <div className="col-lg-4">
              <div className="card supplier-bid-form-card shadow-sm border-0 rounded-4 p-4 bg-white sticky-top" style={{ top: '90px' }}>
                <h2 className="fs-5 fw-bold mb-3">Place Bid Offer</h2>
                {selectedRequest && (
                  <div className="supplier-bid-form-request">
                    <strong>{selectedRequest.title}</strong>
                    <span>
                      {selectedRequest.requesterName || `${selectedRequest.requesterRole} buyer`}
                      {' '}· {selectedRequest.requesterRole} · {selectedRequest.city}
                    </span>
                    <small>
                      Ref {selectedRequest.requestReference || String(selectedRequest.id).slice(0, 8).toUpperCase()}
                      {' '}· {selectedRequest.requiredQuantity} {selectedRequest.unit}
                    </small>
                  </div>
                )}
                <form onSubmit={handleSubmitBid}>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Inventory Product</label>
                    <select
                      className="form-control"
                      value={bidForm.productId}
                      onChange={(event) => setBidForm({ ...bidForm, productId: event.target.value })}
                      required
                    >
                      <option value="">Select a matching product</option>
                      {matchingProducts.map((product) => {
                        const enoughStock = Number(product.stock) >= Number(selectedRequest?.requiredQuantity || 0);
                        const selectable = product.status === 'Active' && enoughStock;
                        const reason = product.status !== 'Active'
                          ? product.status
                          : enoughStock ? `${product.stock} ${product.unit} available` : `Only ${product.stock} ${product.unit} available`;
                        return <option key={product.id} value={product.id} disabled={!selectable}>{product.name} — {reason}</option>;
                      })}
                    </select>
                    {!matchingProducts.length && (
                      <small className="supplier-bid-product-warning">No inventory product matches this request’s category and unit.</small>
                    )}
                    {matchingProducts.length > 0 && !eligibleProducts.length && (
                      <small className="supplier-bid-product-warning">Your matching products do not currently have enough available stock.</small>
                    )}
                    {selectedProduct && (
                      <small className="supplier-bid-product-note">
                        Catalog wholesale price: {formatCurrency(selectedProduct.wholesalePrice ?? selectedProduct.price)}. Your bid price below can be different.
                      </small>
                    )}
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Your Bid Price (per unit)</label>
                    <input type="number" min="0.01" step="0.01" className="form-control" value={bidForm.amount} onChange={(event) => setBidForm({ ...bidForm, amount: event.target.value })} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Delivery Time (days)</label>
                    <input type="number" min="1" className="form-control" value={bidForm.deliveryDays} onChange={(event) => setBidForm({ ...bidForm, deliveryDays: event.target.value })} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Offer Notes</label>
                    <textarea className="form-control" rows="3" value={bidForm.notes} onChange={(event) => setBidForm({ ...bidForm, notes: event.target.value })} />
                  </div>
                  <div className="d-flex gap-2">
                    <button type="submit" disabled={submitting || !selectedProduct || !productCanFulfilRequest(selectedProduct, selectedRequest)} className="btn btn-orange-cta w-100 fw-bold">
                      {submitting ? 'Saving...' : 'Submit Bid'}
                    </button>
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setBidForm(emptyForm)}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
  );

  if (embedded) return content;
  return <><RoleNavbar />{content}</>;
}
