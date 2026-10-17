import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import LandingNavbar from '../components/common/LandingNavbar';
import RoleNavbar from '../components/common/RoleNavbar';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import formatCurrency from '../utils/formatCurrency';

import getApiAssetUrl from '../utils/getApiAssetUrl';
import './CartPage.css';


export default function CartPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { user } = useAuth();
  const { items, totals, updateQuantity, removeFromCart, pendingOrderId } = useCart();

  const [imgErrors, setImgErrors] = useState({});
  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: location }, replace: true });
    }
  }, [user, navigate, location]);

  const goToCheckout = () => {
    if (!items.length) return;
    navigate('/checkout');
  };

  if (pendingOrderId) return <Navigate to={`/payments/checkout/${pendingOrderId}`} replace />;

  return (
    <main className="cart-page">

      {user ? <RoleNavbar /> : <LandingNavbar />}

      {/* HERO */}

      <section className="cart-hero conmat-page-hero conmat-page-hero--after-nav">
        <div>
          <span className="cart-page-eyebrow">Shopping Cart</span>
          <h1>Review your construction material cart.</h1>
          <p>Check quantities and products before continuing to checkout.</p>
        </div>

        <strong>{totals.count} {totals.count === 1 ? 'item' : 'items'}</strong>
      </section>


      {/* CART LAYOUT */}

      <section className="cart-layout">

        {/* CART ITEMS */}

        <div className="cart-items">

          {items.length ? (
            items.map((item) => {
              const imageSrc = getApiAssetUrl(item.imageUrl || item.image);
              const isTiered = item.pricingModel === 'tiered' || String(item.sellerRole || '').toLowerCase() === 'wholesaler';
              const hasTierPrices = item.retailPrice != null && item.wholesalePrice != null;

              return (
                <article className="cart-item" key={item.cartKey}>

                  {/* IMAGE */}
                  <div className="cart-item__image">
                    {imageSrc && !imgErrors[item.cartKey] ? (
                      <img
                        src={imageSrc}
                        alt={item.name}
                        onError={() => setImgErrors((previous) => ({ ...previous, [item.cartKey]: true }))}
                      />
                    ) : (
                      <span>{item.category?.slice(0, 1) || 'C'}</span>
                    )}
                  </div>

                  {/* CONTENT */}
                  <div className="cart-item__content">

                    {/* TOP */}
                    <div className="cart-item__top">
                      <div>
                        <h3>{item.name}</h3>
                        <p>{item.category} • {item.city} • {item.pricingType} price applied</p>
                        {isTiered && hasTierPrices && (
                          <div className="cart-item__tier-prices">
                            <span className={item.pricingType === 'retail' ? 'is-active' : ''}>
                              Retail <strong>{formatCurrency(item.retailPrice)}</strong>
                            </span>
                            <span className={item.pricingType === 'wholesale' ? 'is-active' : ''}>
                              Wholesale <strong>{formatCurrency(item.wholesalePrice)}</strong>
                            </span>
                            <small>Wholesale price applies from {item.wholesaleMinimum} {item.unit || 'units'}.</small>
                          </div>
                        )}
                      </div>

                      <button type="button" onClick={() => removeFromCart(item.cartKey)}>
                        Remove
                      </button>
                    </div>

                    {/* BOTTOM */}
                    <div className="cart-item__bottom">
                      <label>
                        Qty {Number(item.minQuantity || 1) > 1 ? `(minimum ${item.minQuantity})` : ''}
                        <input
                          type="number"
                          min={item.minQuantity || 1}
                          max={item.stock || 1}
                          value={item.quantity}
                          onChange={(event) => updateQuantity(item.cartKey, event.target.value)}
                        />
                      </label>

                      <div>
                        <small>Unit price</small>
                        <strong>{formatCurrency(item.unitPrice)}</strong>
                      </div>

                      <div>
                        <small>Line total</small>
                        <strong>{formatCurrency(item.unitPrice * item.quantity)}</strong>
                      </div>
                    </div>

                  </div>

                </article>
              );
            })
          ) : (
            /* EMPTY CART */
            <div className="cart-empty">
              <h2>Your cart is empty</h2>
              <p>Go to the marketplace and add products to start an order.</p>
              <button type="button" className="landing-primary-cta" onClick={() => navigate('/marketplace')}>
                Browse Marketplace
              </button>
            </div>
          )}

        </div>


        {/* CART SUMMARY */}

        <aside className="cart-summary">
          <h2>Cart Summary</h2>

          <div className="cart-summary__line">
            <span>Subtotal</span>
            <strong>{formatCurrency(totals.subtotal)}</strong>
          </div>

          {totals.discount > 0 && (
            <div className="cart-summary__line">
              <span>Wholesale Discount</span>
              <strong>-{formatCurrency(totals.discount)}</strong>
            </div>
          )}

          <div className="cart-summary__line">
            <span>Delivery</span>
            <strong>{totals.shippingFee === 0 ? 'Free' : formatCurrency(totals.shippingFee)}</strong>
          </div>

          <div className="cart-summary__total">
            <span>Total</span>
            <strong>{formatCurrency(totals.total)}</strong>
          </div>

          {/* CHECKOUT BUTTON */}
          <button type="button" className="landing-primary-cta" disabled={!items.length} onClick={goToCheckout}>
            Continue to Checkout
          </button>

        </aside>

      </section>

    </main>
  );
}
