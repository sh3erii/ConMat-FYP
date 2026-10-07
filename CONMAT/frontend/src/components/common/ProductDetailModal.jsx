import { useMemo, useState } from 'react';
import { Flag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import formatCurrency from '../../utils/formatCurrency';
import getApiAssetUrl from '../../utils/getApiAssetUrl';
import { getWholesaleMinimum, resolveProductPricing } from '../../utils/productPricing';
import './ProductDetailModal.css';

export default function ProductDetailModal({
  product,
  pricingMode,
  onClose,
  onAddToCart
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const viewerRole = String(user?.role || '').toLowerCase();
  const isReadOnlyViewer = ['supplier', 'admin'].includes(viewerRole);
  const isOwnListing = Boolean(user?.id && String(user.id) === String(product.sellerId || product.seller?.id));
  const sellerRole = String(product.sellerRole || product.seller?.role || '').toLowerCase();
  const isSupplierListing = sellerRole === 'supplier' || product.pricingModel === 'minimum';
  const isWholesalerListing = sellerRole === 'wholesaler' || product.pricingModel === 'tiered';
  const wholesaleMinimum = getWholesaleMinimum(product);
  const minimumOrderQuantity = isSupplierListing ? wholesaleMinimum : 1;
  const stock = Math.max(0, Math.floor(Number(product.stock || 0)));
  const initialQuantity = isWholesalerListing && pricingMode === 'wholesale' && stock >= wholesaleMinimum
    ? wholesaleMinimum
    : minimumOrderQuantity;

  const [quantity, setQuantity] = useState(initialQuantity);
  const [imgError, setImgError] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Misleading information');
  const [reportDetails, setReportDetails] = useState('');
  const [reportMessage, setReportMessage] = useState('');
  const [reporting, setReporting] = useState(false);

  const activePricing = resolveProductPricing(product, sellerRole, quantity);
  const retailPrice = resolveProductPricing(product, 'retailer', 1).unitPrice;
  const wholesalePrice = resolveProductPricing(product, 'wholesaler', wholesaleMinimum).unitPrice;
  const activePrice = activePricing.unitPrice;

  const sellerName =
    product.sellerName ||
    product.seller?.businessName ||
    product.seller?.companyName ||
    product.seller?.name ||
    product.supplierName ||
    product.brand ||
    'Seller';

  const canOrder = stock >= minimumOrderQuantity;
  const deliveryCharge = Math.max(0, Number(product.deliveryCharge || 0));
  const freeDeliveryMinQuantity = product.freeDeliveryMinQuantity == null ? null : Number(product.freeDeliveryMinQuantity);

  const imageSrc = getApiAssetUrl(product.imageUrl);

  const total = useMemo(
    () =>
      Number(activePrice || 0) *
      Number(quantity || 0),
    [activePrice, quantity]
  );

  const handleQuantity = (event) => {
    const next = Math.max(
      minimumOrderQuantity,
      Math.floor(Number(event.target.value || 1))
    );

    setQuantity(canOrder ? Math.min(stock, next) : minimumOrderQuantity);
  };

  const handleAddToCart = () => {
    onAddToCart(
      product,
      quantity,
      activePricing.pricingType
    );

    onClose();
  };

  const openReportForm = () => {
    if (!user) {
      onClose();
      navigate('/login');
      return;
    }
    setReportMessage('');
    setReportOpen(true);
  };

  const submitReport = async (event) => {
    event.preventDefault();
    setReporting(true);
    setReportMessage('');
    try {
      const { data } = await api.post(`/products/${product.id}/report`, {
        reason: reportReason,
        details: reportDetails,
      });
      setReportMessage(data.message || 'Report submitted to the admin team.');
      setReportDetails('');
      setReportOpen(false);
    } catch (error) {
      setReportMessage(error.response?.data?.message || 'Unable to submit this report.');
    } finally {
      setReporting(false);
    }
  };

  return (
    <div
      className="product-modal"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >

      <div
        className="product-modal__card"
        onClick={(event) =>
          event.stopPropagation()
        }
      >

        <button
          className="product-modal__close"
          type="button"
          onClick={onClose}
          aria-label="Close product details"
        >
          ×
        </button>

        {/* IMAGE */}
        <div
          className="product-modal__media"
          style={{ height: '360px' }}
        >
          {imageSrc && !imgError ? (
            <img
              src={imageSrc}
              alt={product.name}
              onError={() =>
                setImgError(true)
              }
            />
          ) : (
            <span>
              {product.category?.slice(0, 1) || 'C'}
            </span>
          )}
        </div>

        {/* CONTENT */}
        <div className="product-modal__content">

          <div className="product-modal__chips">
            <span>{product.category}</span>
            <span>{product.city}</span>
            <span className="product-modal__seller-chip">
              {sellerName}
            </span>
            <span>
              {stock} in stock
            </span>
          </div>

          <h2>{product.name}</h2>

          <p>
            {product.description ||
              'Detailed construction material information will appear here after seller enters full product description.'}
          </p>

          {/* PRICES */}
          <div className="product-modal__price-grid">

            <div className={!isWholesalerListing || activePricing.pricingType === 'retail' ? 'is-active' : ''}>
              <small>{isSupplierListing ? 'Price' : 'Retail Price'}</small>
              <strong>
                {formatCurrency(isSupplierListing ? activePrice : retailPrice)}
              </strong>
            </div>

            {isWholesalerListing && (
              <div className={activePricing.pricingType === 'wholesale' ? 'is-active' : ''}>
                <small>Wholesale Price</small>
                <strong>
                  {formatCurrency(wholesalePrice)}
                </strong>
              </div>
            )}

            {(isWholesalerListing || isSupplierListing) && (
              <div>
                <small>{isSupplierListing ? 'Minimum Order Quantity' : 'Minimum Wholesale Quantity'}</small>
                <strong>
                  {wholesaleMinimum} {product.unit || 'units'}
                </strong>
              </div>
            )}

            <div>
              <small>Delivery</small>
              <strong>{deliveryCharge === 0 ? 'Free' : formatCurrency(deliveryCharge)}</strong>
              {deliveryCharge > 0 && freeDeliveryMinQuantity && (
                <small>Free from {freeDeliveryMinQuantity} {product.unit || 'units'}</small>
              )}
            </div>

          </div>

          {isWholesalerListing && (
            <div className="product-modal__pricing-status" role="status">
              <strong>{activePricing.pricingType === 'wholesale' ? 'Wholesale price applied' : 'Retail price applied'}</strong>
              <span>Wholesale pricing starts at {wholesaleMinimum} {product.unit || 'units'} and updates automatically with quantity.</span>
            </div>
          )}

          {isOwnListing ? (
            <div className="product-modal__own-listing" role="status">
              <strong>Your product</strong>
              <span>You cannot add your own marketplace listing to the cart.</span>
            </div>
          ) : !isReadOnlyViewer && (
            <>
              {/* ORDER */}
              <div className="product-modal__order-box">

                <label htmlFor="detailQty">
                  Quantity
                </label>

                <input
                  id="detailQty"
                  type="number"
                  min={minimumOrderQuantity}
                  max={stock || 1}
                  value={quantity}
                  onChange={handleQuantity}
                />

                <div>
                  <small>Estimated Total</small>
                  <strong>
                    {formatCurrency(total)}
                  </strong>
                </div>

              </div>

              <button
                className="product-modal__add"
                type="button"
                disabled={!canOrder}
                onClick={handleAddToCart}
              >
                {canOrder ? 'Add to Cart' : `Minimum order unavailable (${minimumOrderQuantity} required)`}
              </button>
            </>
          )}

          {!isOwnListing && (
            <div className="product-modal__report">
              <button type="button" className="product-modal__report-trigger" onClick={openReportForm}>
                <Flag size={16} /> Report this listing
              </button>

              {reportOpen && (
                <form className="product-modal__report-form" onSubmit={submitReport}>
                  <label>
                    Reason
                    <select value={reportReason} onChange={(event) => setReportReason(event.target.value)}>
                      <option>Misleading information</option>
                      <option>Incorrect pricing</option>
                      <option>Prohibited item</option>
                      <option>Fraud or scam</option>
                      <option>Other</option>
                    </select>
                  </label>
                  <label>
                    Additional details
                    <textarea
                      value={reportDetails}
                      onChange={(event) => setReportDetails(event.target.value)}
                      maxLength={1000}
                      rows={3}
                      placeholder="Explain what the admin should review."
                    />
                  </label>
                  <div>
                    <button type="button" onClick={() => setReportOpen(false)}>Cancel</button>
                    <button type="submit" disabled={reporting}>{reporting ? 'Submitting...' : 'Submit Report'}</button>
                  </div>
                </form>
              )}

              {reportMessage && <p className="product-modal__report-message">{reportMessage}</p>}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
