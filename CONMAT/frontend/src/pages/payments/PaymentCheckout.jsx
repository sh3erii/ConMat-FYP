import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LoaderCircle, XCircle } from 'lucide-react';
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import PaymentMethodCard from '../../components/payments/PaymentMethodCard';
import PaymentSummaryPanel from '../../components/payments/PaymentSummaryPanel';
import RoleNavbar from '../../components/common/RoleNavbar';
import { useCart } from '../../context/CartContext';
import { cancelOrder } from '../../services/orderService';
import { confirmPaymentIntent, createPaymentIntent, getPaymentOrder } from '../../services/paymentService';
import { canCancelBuyerOrder, isOrderCancelled } from '../../utils/orderActions';
import './PaymentCheckout.css';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

function CardPaymentForm({ orderId, order, paymentIntent, onCancelOrder, cancelling }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  const handlePayNow = async () => {
    if (!stripe || !elements || !paymentIntent?.clientSecret) return;

    const card = elements.getElement(CardElement);
    if (!card) return;

    setPaying(true);
    setError('');

    try {
      const result = await stripe.confirmCardPayment(paymentIntent.clientSecret, {
        payment_method: { card },
      });

      if (result.error) throw new Error(result.error.message || 'Payment could not be completed.');
      if (!result.paymentIntent || result.paymentIntent.status !== 'succeeded') throw new Error('Stripe has not confirmed this payment yet.');

      const confirmation = await confirmPaymentIntent(orderId, result.paymentIntent.id);
      clearCart();
      navigate(`/payment-success?orderId=${encodeURIComponent(orderId)}&invoiceId=${encodeURIComponent(confirmation.invoiceId)}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Payment could not be completed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <section className="payment-checkout__grid">
      <div className="payment-checkout__left">
        <PaymentMethodCard selectedMethod={selectedMethod} onSelect={setSelectedMethod} />

        <div className="payment-checkout__gateway-box">
          <h3>Stripe Card Details</h3>
          <div className="payment-checkout__stripe-element">
            <CardElement options={{ hidePostalCode: true }} />
          </div>
        </div>

        {error && <div className="payment-checkout__error">{error}</div>}

        <div className="payment-checkout__checkout-actions">
          <button className="payment-checkout__pay" type="button" onClick={handlePayNow} disabled={paying || cancelling || !stripe}>
            {paying ? 'Processing Payment...' : 'Pay Now Securely'}
          </button>
          <button className="payment-checkout__cancel" type="button" onClick={onCancelOrder} disabled={paying || cancelling}>
            {cancelling ? <LoaderCircle className="payment-checkout__spinner" size={18} /> : <XCircle size={18} />}
            {cancelling ? 'Cancelling...' : 'Cancel Payment & Order'}
          </button>
        </div>
      </div>

      <PaymentSummaryPanel order={order} />
    </section>
  );
}

export default function PaymentCheckout() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { clearCart, releasePendingOrder } = useCart();
  const [order, setOrder] = useState(null);
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadPaymentData() {
      setLoading(true);
      setError('');

      try {
        const orderData = await getPaymentOrder(orderId);
        if (!active) return;
        if (isOrderCancelled(orderData)) {
          clearCart();
          navigate(`/orders/${encodeURIComponent(orderId)}`, { replace: true });
          return;
        }
        setOrder(orderData);
        const intentData = await createPaymentIntent(orderId);
        if (!active) return;
        if (intentData?.alreadyPaid) {
          clearCart();
          if (intentData.invoiceId) {
            navigate(`/payment-success?orderId=${encodeURIComponent(orderId)}&invoiceId=${encodeURIComponent(intentData.invoiceId)}`, { replace: true });
          } else {
            navigate(`/orders/${encodeURIComponent(orderId)}`, { replace: true });
          }
          return;
        }
        setPaymentIntent(intentData);
      } catch (err) {
        if (!active) return;
        if (err.response?.status === 404) {
          releasePendingOrder();
          navigate('/checkout', { replace: true });
          return;
        }
        setError(err.response?.data?.message || 'Unable to load payment details. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPaymentData();
    return () => { active = false; };
  }, [orderId, navigate, clearCart, releasePendingOrder]);

  const handleCancelOrder = async () => {
    if (!order || !canCancelBuyerOrder(order)) return;
    if (!window.confirm(`Cancel order ${order.orderNumber}? No inventory will be deducted for this unpaid order.`)) return;
    const reason = window.prompt('Reason for cancellation (optional):', '') ?? null;
    if (reason === null) return;
    setCancelling(true);
    setError('');
    try {
      const response = await cancelOrder(orderId, reason.trim());
      clearCart();
      navigate('/orders', {
        replace: true,
        state: { orderMessage: response.message || `Order ${order.orderNumber} was cancelled.` },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to cancel this order.');
    } finally {
      setCancelling(false);
    }
  };

  const elementsOptions = useMemo(() => paymentIntent?.clientSecret ? { clientSecret: paymentIntent.clientSecret } : undefined, [paymentIntent]);
  const recoveryCancelButton = canCancelBuyerOrder(order) ? (
    <button className="payment-checkout__cancel payment-checkout__cancel--recovery" type="button" onClick={handleCancelOrder} disabled={cancelling}>
      {cancelling ? <LoaderCircle className="payment-checkout__spinner" size={18} /> : <XCircle size={18} />}
      {cancelling ? 'Cancelling...' : 'Cancel Payment & Order'}
    </button>
  ) : null;

  return (
    <>
      <RoleNavbar hideCart />
      <main className="payment-checkout">
        <div className="payment-checkout__inner conmat-page-shell">
          <section className="payment-checkout__hero conmat-page-hero">
            <div>
              <p>Secure Payment</p>
              <h1>Complete your ConMat order payment</h1>
              <span>Pay with a Stripe card, receive an invoice, and keep seller funds protected until delivery is resolved.</span>
            </div>
          </section>

          {loading ? (
            <p className="payment-checkout__loading">Preparing secure payment...</p>
          ) : error ? (
            <div className="payment-checkout__recovery"><div className="payment-checkout__error">{error}</div>{recoveryCancelButton}</div>
          ) : !stripePromise ? (
            <div className="payment-checkout__recovery"><div className="payment-checkout__error">VITE_STRIPE_PUBLISHABLE_KEY is not configured in the frontend environment.</div>{recoveryCancelButton}</div>
          ) : (
            <Elements stripe={stripePromise} options={elementsOptions}>
              <CardPaymentForm orderId={orderId} order={order} paymentIntent={paymentIntent} onCancelOrder={handleCancelOrder} cancelling={cancelling} />
            </Elements>
          )}
        </div>
      </main>
    </>
  );
}
