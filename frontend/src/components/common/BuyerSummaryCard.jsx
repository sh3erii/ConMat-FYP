import './BuyerSummaryCard.css';

export default function BuyerSummaryCard({ label, value, hint, tone = 'blue' }) {
  return (
    <article className={`buyer-summary-card buyer-summary-card--${tone}`}>
      <div className="buyer-summary-card__icon" aria-hidden="true">
        {label?.charAt(0) || 'C'}
      </div>
      <div>
        <p>{label}</p>
        <h3>{value}</h3>
        <span>{hint}</span>
      </div>
    </article>
  );
}
