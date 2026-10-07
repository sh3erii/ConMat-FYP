import { CreditCard, Lock } from 'lucide-react';
import './PaymentMethodCard.css';

export default function PaymentMethodCard({ selectedMethod, onSelect }) {
  const methods = [
    {
      id: 'card',
      title: 'Stripe Card Payment',
      text: 'Secure online card payment',
      icon: <CreditCard size={20} />,
    },
  ];

  return (
    <div className="payment-method-card">
      <div className="payment-method-card__title">
        <Lock size={20} />
        <div>
          <h3>Choose Payment Method</h3>
          <p>Card details are processed securely by Stripe.</p>
        </div>
      </div>

      <div className="payment-method-card__options">
        {methods.map((method) => (
          <button
            key={method.id}
            type="button"
            className={
              selectedMethod === method.id
                ? 'payment-method-card__option is-active'
                : 'payment-method-card__option'
            }
            onClick={() => onSelect(method.id)}
          >
            <span>{method.icon}</span>

            <div>
              <strong>{method.title}</strong>
              <small>{method.text}</small>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}