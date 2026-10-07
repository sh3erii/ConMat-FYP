import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';
import RoleNavbar from '../../components/common/RoleNavbar';
import api from '../../services/api';
import '../CartPage.css';

export default function CustomerInvoicesPage() {
  const location = useLocation();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/invoices')
      .then(({ data }) => active && setInvoices(data.invoices || data.data || []))
      .catch((err) => active && setError(err.response?.data?.message || 'Unable to load invoices.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  return (
    <main className="customer-invoices-page">
      <RoleNavbar />
      <section className="cart-hero conmat-page-hero conmat-page-hero--after-nav"><div><span className="hero-eyebrow">Your Invoices</span><h1>Manage your payment invoices.</h1><p>View and download invoices for your completed orders.</p></div></section>
      <div className="app-container px-3 px-md-4 py-4">
        {location.state?.message && <div className="alert alert-info mt-3">{location.state.message}</div>}
        {error && <div className="alert alert-danger mt-3">{error}</div>}
        <h2 className="mb-3">Invoices ({invoices.length} invoices)</h2>
        {loading ? <div className="alert alert-info mt-3">Loading invoices...</div> : invoices.length > 0 ? (
          <div className="list-group">{invoices.map((invoice) => <div key={invoice.id} className="list-group-item list-group-item-action flex-column align-items-start mb-3 shadow-sm rounded-3"><div className="d-flex w-100 justify-content-between align-items-center"><h5 className="mb-1 fw-bold">Invoice #{invoice.invoiceNumber || invoice.id}</h5><small className="text-muted">{invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : ''}</small></div><p className="mb-1">Order: {invoice.orderNumber || invoice.orderId}</p><small className="d-block mb-2">Amount: <strong className="text-brand">{formatCurrency(invoice.amount ?? invoice.total)}</strong></small><p className="mb-1">Status: <strong>{invoice.status}</strong></p><div className="d-flex justify-content-end mt-2"><Link className="btn btn-sm btn-orange-cta" to={`/invoices/${invoice.id}`}>View / Save PDF</Link></div></div>)}</div>
        ) : <div className="alert alert-info mt-3"><p className="mb-0">No invoices available yet. Invoices are generated after successful payment.</p></div>}
      </div>
    </main>
  );
}
