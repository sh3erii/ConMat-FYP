import { formatCurrency } from '../../utils/formatCurrency';
import './BidOfferCard.css';

export default function BidOfferCard({ offer, isSelected = false, onAccept }) {
  const sellerName = offer.supplierName || offer.sellerName || 'Seller';
  const status = String(offer.status || 'Submitted');
  const total = offer.totalAmount ?? (Number(offer.bidAmount || 0) * Number(offer.quantity || 0));

  return (
    <article className={`bid-offer-card ${isSelected ? 'bid-offer-card--selected' : ''}`}>
      <div className="bid-offer-card__top">
        <div>
          {offer.rank && <span className="bid-offer-card__score">Rank #{offer.rank}{offer.recommended ? ' · Recommended' : ''}</span>}
          <h3>{sellerName}</h3>
          <p>{[offer.city, offer.supplierRole].filter(Boolean).join(' · ')}</p>
        </div>
        <span className={`bid-offer-card__status bid-offer-card__status--${status.toLowerCase()}`}>
          {isSelected ? 'Selected' : status}
        </span>
      </div>

      <div className="bid-offer-card__metrics">
        <div><small>Unit Bid</small><strong>{formatCurrency(offer.bidAmount)}</strong></div>
        <div><small>Delivery</small><strong>{offer.deliveryDays} days</strong></div>
        <div><small>Offer Total</small><strong>{total ? formatCurrency(total) : '—'}</strong></div>
      </div>

      <p className="bid-offer-card__product">
        Inventory product: <strong>{offer.productName || 'Not linked'}</strong>
        {offer.productUnit ? ` · ${offer.productStock} ${offer.productUnit} currently in stock` : ''}
      </p>

      {offer.notes && <p className="bid-offer-card__notes">{offer.notes}</p>}

      {onAccept && status !== 'Rejected' && status !== 'Cancelled' && (
        <button type="button" className="bid-offer-card__button bid-offer-card__button--orange btn text-white" onClick={() => onAccept(offer)} disabled={isSelected}>
          {isSelected ? 'Offer Selected' : 'Accept & Convert to Order'}
        </button>
      )}
    </article>
  );
}
