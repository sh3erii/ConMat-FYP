import { Link, useSearchParams } from 'react-router-dom';
import { RotateCcw, CircleX } from 'lucide-react';
import RoleNavbar from '../../components/common/RoleNavbar';
import './PaymentFailed.css';

export default function PaymentFailed() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <>
      <RoleNavbar hideNavLinks hideCart />
      <main className="payment-failed">
        <section className="payment-failed__card">
          <div className="payment-failed__icon"><CircleX size={48} /></div>

          <p>{orderId ? 'Payment Failed' : 'Payment Result'}</p>

          <h1>{orderId ? 'Your payment could not be processed.' : 'No failed payment was provided.'}</h1>

          <span>
            {orderId
              ? `No amount was confirmed for order ${orderId}. Please try again or contact support if the issue continues.`
              : 'Open an order to start or retry a payment.'}
          </span>

          {orderId ? (
            <Link to={`/payments/checkout/${orderId}`} className="btn btn-orange-cta payment-failed__retry-btn text-white">
              <RotateCcw size={18} />
              Try Payment Again
            </Link>
          ) : (
            <Link to="/orders" className="btn btn-orange-cta payment-failed__retry-btn text-white">
              View Orders
            </Link>
          )}
        </section>
      </main>
    </>
  );
}