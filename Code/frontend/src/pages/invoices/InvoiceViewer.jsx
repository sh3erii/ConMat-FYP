import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileX2 } from 'lucide-react';
import InvoicePreviewCard from '../../components/invoices/InvoicePreviewCard';
import RoleNavbar from '../../components/common/RoleNavbar';
import { getInvoice } from '../../services/paymentService';
import './InvoiceViewer.css';

export default function InvoiceViewer() {
  const { invoiceId } = useParams();
  const [invoice, setInvoice] = useState(undefined);

  useEffect(() => {
    let active = true;

    async function loadInvoice() {
      const data = await getInvoice(invoiceId);
      if (active) setInvoice(data || null);
    }

    loadInvoice();
    return () => {
      active = false;
    };
  }, [invoiceId]);

  return (
    <>
      <RoleNavbar />
      <main className="invoice-viewer conmat-page-shell">
        <section className="invoice-viewer__hero conmat-page-hero">
          <p>Invoice Center</p>
          <h1>View and print your ConMat digital invoice</h1>
          <span>
            Invoices are generated after successful payment and can be printed
            for buyer/seller records.
          </span>
        </section>

        <div className="invoice-viewer__actions">
          <Link to="/invoices">
            <ArrowLeft size={16} />
            View More
          </Link>
        </div>

        {invoice === undefined ? (
          <p className="invoice-viewer__loading">Loading invoice...</p>
        ) : invoice ? (
          <InvoicePreviewCard invoice={invoice} />
        ) : (
          <section className="invoice-viewer__empty" role="status">
            <FileX2 size={42} aria-hidden="true" />
            <span>Invoice not found</span>
            <h2>This invoice is unavailable.</h2>
            <p>Invoices appear here only after a successful payment.</p>
            <Link to="/invoices">View available invoices</Link>
          </section>
        )}
      </main>
    </>
  );
}
