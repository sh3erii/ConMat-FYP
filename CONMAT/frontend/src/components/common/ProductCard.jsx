import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import formatCurrency from '../../utils/formatCurrency';
import getApiAssetUrl from '../../utils/getApiAssetUrl';
import { getProductStockHealth, getWholesaleMinimum, resolveProductPricing } from '../../utils/productPricing';
import './ProductCard.css';

export default function ProductCard({
  product,
  pricingMode = 'retail',
  onView,
  onAddToCart
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const viewerRole = String(user?.role || '').toLowerCase();
  const isReadOnlyViewer = ['supplier', 'admin'].includes(viewerRole);
  const sellerRole = String(product.sellerRole || product.seller?.role || '').toLowerCase();
  const isSupplierListing = sellerRole === 'supplier' || product.pricingModel === 'minimum';
  const isWholesalerListing = sellerRole === 'wholesaler' || product.pricingModel === 'tiered';
  const wholesaleMinimum = getWholesaleMinimum(product);
  const minimumOrderQuantity = isSupplierListing ? wholesaleMinimum : 1;

  const sellerName =
    product.sellerName ||
    product.seller?.businessName ||
    product.seller?.companyName ||
    product.seller?.name ||
    product.supplierName ||
    product.brand ||
    'Seller';

  const sellerId =
    product.sellerId ||
    product.seller?.id ||
    product.seller?._id ||
    product.supplierId ||
    product.supplier?.id ||
    product.userId;
  const isOwnListing = Boolean(user?.id && sellerId && String(user.id) === String(sellerId));
  const showOrderControls = !isReadOnlyViewer && !isOwnListing;

  const stockHealth = getProductStockHealth(product);
  const stock = stockHealth.stock;
  const lowStock = stockHealth.isLowStock;
  const outOfStock = stockHealth.isOutOfStock;
  const canOrder = !outOfStock && stock >= minimumOrderQuantity;
  const deliveryCharge = Math.max(0, Number(product.deliveryCharge || 0));
  const freeDeliveryMinQuantity = product.freeDeliveryMinQuantity == null ? null : Number(product.freeDeliveryMinQuantity);

  const initialQuantity = isWholesalerListing && pricingMode === 'wholesale' && stock >= wholesaleMinimum
    ? wholesaleMinimum
    : minimumOrderQuantity;
  const [imgError, setImgError] = useState(false);
  const [quantity, setQuantity] = useState(String(initialQuantity));
  const [quantityError, setQuantityError] = useState(() => stock < minimumOrderQuantity
    ? `Only ${stock} ${product.unit || 'units'} are available; the minimum order is ${minimumOrderQuantity}.`
    : '');

  const selectedQuantity = Number(quantity) || initialQuantity;
  const activePricing = resolveProductPricing(product, sellerRole, selectedQuantity);
  const retailPrice = resolveProductPricing(product, 'retailer', 1).unitPrice;
  const wholesalePrice = resolveProductPricing(product, 'wholesaler', wholesaleMinimum).unitPrice;

  const imageSrc = getApiAssetUrl(product.imageUrl);

  const validateQuantity = (value) => {
    if (String(value).trim() === '') return 'Enter a quantity.';
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) return 'Quantity must be a whole number.';
    if (parsed < minimumOrderQuantity) return `Minimum quantity is ${minimumOrderQuantity} ${product.unit || 'units'}.`;
    if (parsed > stock) return `Maximum available quantity is ${stock} ${product.unit || 'units'}.`;
    return '';
  };

  const handleQuantityChange = (event) => {
    const value = event.target.value;
    setQuantity(value);
    setQuantityError(validateQuantity(value));
  };

  const handleAddToCart = () => {
    const validationMessage = validateQuantity(quantity);
    if (validationMessage) {
      setQuantityError(validationMessage);
      return;
    }
    onAddToCart(product, Number(quantity), activePricing.pricingType);
  };

  const handleSellerClick = () => {
    if (!sellerId) return;

    navigate(`/seller/${sellerId}`);
  };

  return (
    <article className="product-card">

      {/* PRODUCT IMAGE */}
      <div
        className="product-card__media"
        style={{ height: '220px' }}
      >
        {imageSrc && !imgError ? (
          <img
            src={imageSrc}
            alt={product.name}
            onError={() => setImgError(true)}
            style={{
              objectFit: 'cover',
              width: '100%',
              height: '100%'
            }}
          />
        ) : (
          <div className="product-card__placeholder">
            {product.category?.slice(0, 1) || 'C'}
          </div>
        )}

        <span
          className={`product-card__stock ${
            outOfStock
              ? 'is-out'
              : lowStock
                ? 'is-low'
                : ''
          }`}
        >
          {outOfStock
            ? 'Out of stock'
            : lowStock
              ? `Only ${stock} left`
              : `${stock} in stock`}
        </span>
      </div>

      {/* PRODUCT CONTENT */}
      <div className="product-card__body">

        <div className="product-card__meta">
          <span>{product.category}</span>
          <span>{product.city}</span>
        </div>

        {/* SELLER */}
        {sellerId ? (
          <button
            type="button"
            className="product-card__seller product-card__seller-link"
            onClick={handleSellerClick}
          >
            <span>{sellerName}</span>
          </button>
        ) : (
          <small className="product-card__seller">
            {sellerName}
          </small>
        )}

        <h3>{product.name}</h3>

        <p>
          {product.description ||
            'Construction material listed by a ConMat seller.'}
        </p>

        {/* PRICE */}
        <div className={`product-card__price-row${isWholesalerListing ? ' has-tiers' : ''}`}>
          {isWholesalerListing ? (
            <div className="product-card__tier-prices">
              <div className={activePricing.pricingType === 'retail' ? 'is-active' : ''}>
                <small>Retail price</small>
                <strong>{formatCurrency(retailPrice)}</strong>
              </div>
              <div className={activePricing.pricingType === 'wholesale' ? 'is-active' : ''}>
                <small>Wholesale price</small>
                <strong>{formatCurrency(wholesalePrice)}</strong>
              </div>
            </div>
          ) : (
            <div>
              <small>{isSupplierListing ? 'Price' : 'Retail price'}</small>
              <strong>{formatCurrency(activePricing.unitPrice)}</strong>
            </div>
          )}

          <span>
            /{product.unit || 'unit'}
          </span>
        </div>

        {/* Always reserve space for minimum-order note so cards align across a row */}
        <div className="product-card__minimum-slot" style={{ visibility: (isSupplierListing || isWholesalerListing) ? 'visible' : 'hidden' }}>
          <small className="product-card__minimum">
            {isSupplierListing
              ? `Minimum order: ${minimumOrderQuantity} ${product.unit || 'units'}`
              : `Wholesale from ${wholesaleMinimum} ${product.unit || 'units'} - ${activePricing.pricingType === 'wholesale' ? 'wholesale' : 'retail'} price applies`}
          </small>
        </div>

        <small className="product-card__delivery">
          {deliveryCharge === 0
            ? 'Free delivery'
            : `${formatCurrency(deliveryCharge)} delivery${freeDeliveryMinQuantity ? ` · Free from ${freeDeliveryMinQuantity} ${product.unit || 'units'}` : ''}`}
        </small>

        {showOrderControls && (
          <div className="product-card__quantity-wrap">
            <label htmlFor={`product-quantity-${product.id}`}>
              Quantity ({product.unit || 'units'})
              <input
                id={`product-quantity-${product.id}`}
                type="number"
                inputMode="numeric"
                min={minimumOrderQuantity}
                max={stock}
                step="1"
                value={quantity}
                onChange={handleQuantityChange}
                disabled={!canOrder}
                aria-invalid={Boolean(quantityError)}
                aria-describedby={quantityError ? `product-quantity-error-${product.id}` : undefined}
              />
            </label>
            <small>Allowed: {minimumOrderQuantity}–{stock}</small>
            {quantityError && <div id={`product-quantity-error-${product.id}`} className="product-card__quantity-alert" role="alert">{quantityError}</div>}
          </div>
        )}

        {/* ACTIONS */}
        <div className="product-card__footer">

          <button
            type="button"
            className="product-card__ghost"
            onClick={() => onView(product)}
          >
            View Details
          </button>

          {isOwnListing ? (
            <span className="product-card__own-listing">Your product</span>
          ) : !isReadOnlyViewer && (
            <button
              type="button"
              className="product-card__primary"
              disabled={!canOrder || Boolean(quantityError)}
              onClick={handleAddToCart}
            >
              {canOrder ? 'Add to Cart' : 'Below Minimum Stock'}
            </button>
          )}

        </div>

      </div>
    </article>
  );
}
