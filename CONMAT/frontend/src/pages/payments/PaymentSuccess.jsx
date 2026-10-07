import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, FileText, Truck } from 'lucide-react';
import RoleNavbar from '../../components/common/RoleNavbar';
import './PaymentSuccess.css';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const invoiceId = searchParams.get('invoiceId');
  const hasConfirmation = Boolean(orderId && invoiceId);

  return (
    <>
      <RoleNavbar hideNavLinks hideCart />
      <main className="payment-success">
        <section className="payment-success__card">
          <div className="payment-success__icon"><CheckCircle size={48} /></div>

          <p>{hasConfirmation ? 'Payment Successful' : 'Payment Result'}</p>

          <h1>{hasConfirmation ? 'Your order payment has been completed.' : 'No payment confirmation was provided.'}</h1>

          <span>
            {hasConfirmation
              ? `Order ${orderId} is now paid and your invoice is ready. Seller proceeds are held until you confirm receipt, or released automatically 24 hours after delivery if no issue is reported.`
              : 'Open an order and complete its payment to generate a valid invoice.'}
          </span>

          <div className="payment-success__actions">
            {hasConfirmation ? (
              <>
                <Link to={`/invoices/${invoiceId}`} className="btn btn-orange-cta payment-success__invoice-btn text-white">
                  <FileText size={18} />
                  View Invoice
                </Link>
                <Link
                  to={`/orders/${orderId}/tracking`}
                  state={{ from: '/orders/tracking' }}
                  className="btn payment-success__track-btn text-white"
                >
                  <Truck size={18} />
                  Track Order
                </Link>
              </>
            ) : (
              <Link to="/orders" className="btn btn-orange-cta payment-success__invoice-btn text-white">
                View Orders
              </Link>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
