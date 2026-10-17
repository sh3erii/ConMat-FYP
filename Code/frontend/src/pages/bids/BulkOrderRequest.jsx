import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import RoleNavbar from '../../components/common/RoleNavbar';
import { cityOptionsWithCurrent } from '../../config/pakistanCities';
import { formatCurrency } from '../../utils/formatCurrency';
import { createBulkOrderRequest, getMyBulkRequests } from '../../services/bulkBuyingService';
import './BulkOrderRequest.css';

const initialForm = {
  title: '',
  category: 'Cement',
  city: '',
  requiredQuantity: '',
  unit: 'bag',
  targetPrice: '',
  deliveryAddress: '',
  expiresAt: '',
  notes: '',
};

const todayDateValue = () => new Date().toISOString().slice(0, 10);

export default function BulkOrderRequest({ embedded = false }) {
  const { user } = useAuth();
  const [form, setForm] = useState(() => ({ ...initialForm, city: user?.city || '' }));
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const normalizedRole = String(user?.role || '').toLowerCase();
  const roleName = normalizedRole
    ? `${normalizedRole.charAt(0).toUpperCase()}${normalizedRole.slice(1)}`
    : 'Buyer';


  const loadRequests = async () => {
    setLoadingRequests(true);
    try {
      const response = await getMyBulkRequests();
      setRequests(response.requests || response.bidRequests || response.data || []);
    } catch (error) {
      setRequests([]);
      setMessage(error?.response?.data?.message || error?.message || 'Unable to load your bulk requests.');
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    getMyBulkRequests()
      .then((response) => {
        if (!isMounted) return;
        setRequests(response.requests || response.bidRequests || response.data || []);
      })
      .catch((error) => {
        if (!isMounted) return;
        setRequests([]);
        setMessage(error?.response?.data?.message || error?.message || 'Unable to load your bulk requests.');
      })
      .finally(() => {
        if (isMounted) setLoadingRequests(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const estimatedTotal = useMemo(
    () => Number(form.requiredQuantity || 0) * Number(form.targetPrice || 0),
    [form.requiredQuantity, form.targetPrice]
  );
  const openRequests = useMemo(() => requests.filter((request) => (
    (request.requestStatus || request.status || 'Open') === 'Open'
  )), [requests]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    if (
      !form.title.trim() ||
      !form.city.trim() ||
      Number(form.requiredQuantity) < 1 ||
      Number(form.targetPrice) <= 0 ||
      !form.deliveryAddress.trim()
    ) {
      setMessage('Please select a city and enter the material title, valid quantity, target price and delivery address.');
      return;
    }

    if (form.expiresAt && form.expiresAt < todayDateValue()) {
      setMessage('Request deadline must be today or a future date.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createBulkOrderRequest({
        ...form,
        requiredQuantity: Number(form.requiredQuantity),
        targetPrice: Number(form.targetPrice),
      });
      setMessage('Bulk request submitted successfully. Eligible sellers can now send offers.');
      setForm({ ...initialForm, city: user?.city || '' });
      await loadRequests();
    } catch (error) {
      setMessage(error?.response?.data?.message || error?.message || 'Unable to save the bulk request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
      <main className="bulk-request-page conmat-page-shell">
        <section className="bulk-request-hero conmat-page-hero">
          <div>
            <span className="bulk-buying-workspace-eyebrow">{roleName} Bulk Buying</span>
            <h1>Create a bulk order request and let eligible sellers compete.</h1>
            <p>
              Customers, retailers and wholesalers can publish material requirements,
              review incoming offers and convert the preferred bid into an order.
            </p>
          </div>
        </section>

        <section className="bulk-request-grid">
          <form className="bulk-request-form" onSubmit={handleSubmit}>
            <div className="bulk-request-form__head">
              <span>New Request</span>
              <h2>Material requirement</h2>
            </div>

            {message && <p className="bulk-request-message">{message}</p>}

            <label>
              Material title
              <input name="title" value={form.title} onChange={handleChange} placeholder="Example: DG Cement 50kg bags" />
            </label>

            <div className="bulk-request-two-col">
              <label>
                Category
                <select name="category" value={form.category} onChange={handleChange}>
                  <option>Cement</option>
                  <option>Steel</option>
                  <option>Bricks</option>
                  <option>Sand</option>
                  <option>Crush</option>
                  <option>Tiles</option>
                  <option>Paint</option>
                  <option>Electrical</option>
                  <option>Plumbing</option>
                  <option>Other</option>
                </select>
              </label>
              <label>
                City
                <select name="city" value={form.city} onChange={handleChange} required>
                  <option value="">Select city</option>
                  {cityOptionsWithCurrent(form.city).map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="bulk-request-three-col">
              <label>
                Quantity
                <input name="requiredQuantity" value={form.requiredQuantity} onChange={handleChange} type="number" min="1" placeholder="500" />
              </label>
              <label>
                Unit
                <select name="unit" value={form.unit} onChange={handleChange}>
                  <option>bag</option>
                  <option>kg</option>
                  <option>ton</option>
                  <option>piece</option>
                  <option>bundle</option>
                  <option>cft</option>
                  <option>sqft</option>
                  <option>liter</option>
                </select>
              </label>
              <label>
                Target unit price
                <input name="targetPrice" value={form.targetPrice} onChange={handleChange} type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="1280.00" />
              </label>
            </div>

            <label>
              Delivery address
              <textarea name="deliveryAddress" value={form.deliveryAddress} onChange={handleChange} placeholder="Site address / warehouse address" />
            </label>

            <div className="bulk-request-two-col">
              <label>
                Request deadline
                <input
                  name="expiresAt"
                  value={form.expiresAt}
                  onChange={handleChange}
                  type="date"
                  min={todayDateValue()}
                />
              </label>
              <div className="bulk-request-estimate">
                <small>Estimated target total</small>
                <strong>{formatCurrency(estimatedTotal)}</strong>
              </div>
            </div>

            <label>
              Notes
              <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Brand preference, delivery timing, unloading terms etc." />
            </label>

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Bulk Request'}
            </button>
          </form>

          <aside className="bulk-request-side-panel">
            <div className="bulk-request-side-panel__head">
              <span>Open Requests</span>
              <h2>Active bulk requests</h2>
            </div>
            <div className="bulk-request-list">
              {loadingRequests ? (
                <p>Loading your requests...</p>
              ) : openRequests.length ? openRequests.map((request) => (
                <article key={request.id}>
                  <div>
                    <h3>{request.title}</h3>
                    <p>{request.city} · {request.requiredQuantity} {request.unit}</p>
                  </div>
                  <div>
                    <strong>{request.offersCount ?? 0} offers</strong>
                    <Link to={`/bids/compare/${request.id}`}>Compare</Link>
                  </div>
                </article>
              )) : <p>No open bulk requests.</p>}
            </div>
          </aside>
        </section>
      </main>
  );

  if (embedded) return content;
  return <><RoleNavbar />{content}</>;
}
