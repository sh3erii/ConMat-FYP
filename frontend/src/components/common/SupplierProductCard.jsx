import { useState } from 'react';
import formatCurrency from '../../utils/formatCurrency';
import getApiAssetUrl from '../../utils/getApiAssetUrl';
import { getProductStockHealth } from '../../utils/productPricing';
import './SupplierProductCard.css';


export default function SupplierProductCard({
  product,
  onEdit,
  onDelete,
  onStockUpdate,
  onRequestReview,
  role,
}) {
  const sellerRole = String(role || product.sellerRole || '').toLowerCase();
  const isRetailer = sellerRole === 'retailer';
  const isSupplier = sellerRole === 'supplier';
  const [stock, setStock] = useState(
    product.stock || 0
  );

  const [imgError, setImgError] =
    useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [requestingReview, setRequestingReview] = useState(false);

  const normalizedStatus = String(product.status || '').toLowerCase();
  const needsReview = ['hidden', 'rejected'].includes(normalizedStatus);
  const reviewPending = needsReview && Boolean(product.reviewRequestNote);

  const imageSrc = getApiAssetUrl(
    product.imageUrl
  );

  const stockHealth = getProductStockHealth({ ...product, stock });

  const handleStockSubmit = (event) => {
    event.preventDefault();

    onStockUpdate(
      product,
      Number(stock)
    );
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    const note = reviewNote.trim();
    if (!note) {
      setReviewError('Describe the adjustments you made before requesting review.');
      return;
    }
    setRequestingReview(true);
    setReviewError('');
    try {
      await onRequestReview(product, note);
      setReviewNote('');
      setReviewOpen(false);
    } catch (error) {
      setReviewError(error.response?.data?.message || 'Unable to request another review.');
    } finally {
      setRequestingReview(false);
    }
  };

  return (
    <article className="supplier-product-card">

      {/* Product image */}
      <div
        className="supplier-product-card__media"
        style={{
          height:
            'clamp(180px, 25vh, 240px)',
        }}
      >
        {imageSrc && !imgError ? (
          <img
            src={imageSrc}
            alt={product.name}
            onError={() =>
              setImgError(true)
            }
            style={{
              objectFit: 'cover',
              width: '100%',
              height: '100%',
            }}
          />
        ) : (
          <span>
            {product.category?.slice(0, 1) ||
              'C'}
          </span>
        )}

        <strong
          className={`supplier-product-card__status ${String(
            product.status
          ).toLowerCase()}`}
        >
          {product.status || 'Active'}
        </strong>
      </div>

      {/* Product information */}
      <div className="supplier-product-card__body">

        <div className="supplier-product-card__meta">
          <span>{product.category}</span>
          <span>{product.city}</span>
        </div>

        <h3>{product.name}</h3>

        <p>
          {product.description ||
            'Construction material listing managed by seller.'}
        </p>

        {needsReview && (
          <section className="supplier-product-card__moderation">
            <strong>Admin adjustment note</strong>
            <p>{product.verificationNote || 'Update this listing and explain your changes before requesting another review.'}</p>
            {!reviewPending && (
              <button type="button" onClick={() => setReviewOpen((open) => !open)}>
                {reviewOpen ? 'Cancel review request' : 'Request review'}
              </button>
            )}

            {reviewOpen && !reviewPending && (
              <form onSubmit={handleReviewSubmit}>
                <label>
                  What did you adjust?
                  <textarea
                    value={reviewNote}
                    maxLength={1000}
                    rows={3}
                    onChange={(event) => { setReviewNote(event.target.value); setReviewError(''); }}
                    placeholder="Explain the corrections made to this listing..."
                    required
                  />
                </label>
                {reviewError && <small>{reviewError}</small>}
                <button type="submit" disabled={requestingReview}>
                  {requestingReview ? 'Submitting...' : 'Submit to admin'}
                </button>
              </form>
            )}
          </section>
        )}

        {reviewPending && (
          <section className="supplier-product-card__review-pending">
            <strong>Review requested</strong>
            <p>Your note: {product.reviewRequestNote}</p>
            <small>The listing remains hidden while an admin reviews your adjustments.</small>
          </section>
        )}

        {/* Prices */}
        <div className="supplier-product-card__prices">
          <div>
            <small>{isSupplier ? 'Price' : 'Retail Price'}</small>

            <strong>
              {formatCurrency(
                isSupplier ? (product.price ?? product.wholesalePrice ?? product.retailPrice) : product.retailPrice
              )}
            </strong>
          </div>

          {!isRetailer && !isSupplier && (
            <div>
              <small>Wholesale Price</small>

              <strong>
                {formatCurrency(
                  product.wholesalePrice
                )}
              </strong>
            </div>
          )}

          {!isRetailer && (
            <div>
              <small>{isSupplier ? 'Minimum Order' : 'Minimum Wholesale Qty'}</small>
              <strong>{product.minWholesaleQty || 1} {product.unit || 'units'}</strong>
            </div>
          )}
        </div>

        {/* Stock */}
        <form
          className="supplier-product-card__stock"
          onSubmit={handleStockSubmit}
        >
          <label>
            <span>
              {stockHealth.isOutOfStock
                ? 'Out of stock'
                : stockHealth.isLowStock
                  ? 'Low stock'
                  : 'Stock'}
            </span>

            <input
              type="number"
              min="0"
              value={stock}
              onChange={(event) =>
                setStock(
                  event.target.value
                )
              }
            />
          </label>

          <button
            type="submit"
            className="btn btn-orange-cta supplier-product-card__update-btn"
          >
            Update
          </button>
        </form>

        {/* Edit / Delete */}
        <div className="supplier-product-card__actions">

          <button
            type="button"
            onClick={() =>
              onEdit(product)
            }
            className="btn btn-orange-cta supplier-product-card__edit-btn"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={() =>
              onDelete(product)
            }
            className="btn supplier-product-card__delete-btn"
          >
            Delete
          </button>

        </div>
      </div>
    </article>
  );
}
