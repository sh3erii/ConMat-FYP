import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { cityOptionsWithCurrent } from '../../config/pakistanCities';

import { createCheckoutOrder } from '../../services/orderService';
import { formatCurrency } from '../../utils/formatCurrency';
import { calculateOrderTotals } from '../../utils/calculateOrderTotals';
import { estimateDeliveryWindow } from '../../utils/deliveryEstimate';
import RoleNavbar from '../../components/common/RoleNavbar';

import './CheckoutPage.css';

function normalizeCartItem(item) {
  const quantity = Number(item.quantity || item.qty || 1);
  const price = Number(item.unitPrice || item.wholesalePrice || item.retailPrice || item.price || 0);

  return {
    ...item,
    id: item.id || item.productId || item.cartKey,
    productId: item.productId || item.id,
    sellerName: item.sellerName || item.supplierName || 'Verified ConMat Supplier',
    image: item.image || item.imageUrl || '',
    quantity,
    price,
    unit: item.unit || 'units',
    lineTotal: quantity * price,
  };
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const cart = useCart();

  // CART ITEMS
  const items = useMemo(() => {
    const sourceItems = Array.isArray(cart?.items) ? cart.items : [];
    return sourceItems.map(normalizeCartItem);
  }, [cart]);

  // STATE
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [itemCustom, setItemCustom] = useState({});

  const [form] = useState({
    buyerName: user?.name || user?.fullName || '',
    phone: user?.phone || '',
    city: user?.city || '',
    address: user?.address || user?.street || '',
    paymentMethod: 'stripe',
  });

  // TOTALS
  const totals = useMemo(() => calculateOrderTotals(items), [items]);
  const deliveryEstimate = useMemo(() => (
    estimateDeliveryWindow(form.city, items.map((item) => item.sellerCity || item.city))
  ), [form.city, items]);

  const uniqueSellers = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      const key = item.sellerId || item.sellerName;
      if (!map.has(key)) {
        map.set(key, { name: item.sellerName, city: item.sellerCity, items: [] });
      }
      map.get(key).items.push(item);
    });
    return Array.from(map.values());
  }, [items]);

  const handleItemCustomChange = (productId, field, value) => {
    setItemCustom((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value,
      },
    }));
  };

  const handleToggleCustomAddress = (productId) => {
    setItemCustom((prev) => {
      const current = prev[productId] || {};
      const nextUseCustom = !current.useCustom;
      return {
        ...prev,
        [productId]: {
          ...current,
          useCustom: nextUseCustom,
          address: nextUseCustom ? (current.address || form.address) : current.address,
          city: nextUseCustom ? (current.city || form.city) : current.city,
          phone: nextUseCustom ? (current.phone || form.phone) : current.phone,
        },
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!items.length) {
      setMessage('Your cart is empty. Add products before checkout.');
      return;
    }

    if (!form.buyerName.trim() || !form.phone.trim() || !form.city.trim() || !form.address.trim()) {
      setMessage('Add your name, phone, city, and street address in your profile before checkout.');
      return;
    }

    for (const item of items) {
      const custom = itemCustom[item.productId];
      if (custom?.useCustom) {
        if (!custom.address?.trim() || !custom.city?.trim() || !custom.phone?.trim()) {
          setMessage(`Please complete the custom delivery address, city, and phone for ${item.name}.`);
          return;
        }
      }
    }

    setLoading(true);

    try {
      const payload = {
        ...form,
        checkoutToken: cart.ensureCheckoutToken(),
        items: items.map((item) => {
          const custom = itemCustom[item.productId] || {};
          const itemAddress = (custom.useCustom && custom.address?.trim()) ? custom.address.trim() : form.address.trim();
          const itemCity = (custom.useCustom && custom.city?.trim()) ? custom.city.trim() : form.city.trim();
          const itemPhone = (custom.useCustom && custom.phone?.trim()) ? custom.phone.trim() : form.phone.trim();
          const itemNote = custom.note?.trim() || '';
          return {
            productId: item.productId,
            sellerId: item.sellerId,
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            unitPrice: item.price,
            unit: item.unit,
            delivery: {
              address: itemAddress,
              city: itemCity,
              contactPhone: itemPhone,
              note: itemNote,
            },
            deliveryAddress: itemAddress,
            deliveryCity: itemCity,
            contactPhone: itemPhone,
            buyerNote: itemNote,
          };
        }),
        totals,
      };

      // CREATE ORDER
      const response = await createCheckoutOrder(payload);

      if (!response?.success) {
        setMessage(response?.message || 'Order could not be created. Please try again.');
        return;
      }

      // GET ORDER ID
      const orderId = response.order?.id || response.order?.orderId || response.orderId;

      if (!orderId) {
        setMessage('Order was created, but no order ID was returned.');
        return;
      }

      // GO TO PAYMENT — DO NOT CLEAR CART HERE, payment has not happened yet.
      cart.associatePendingOrder(orderId);
      navigate(`/payments/checkout/${orderId}`, {
        replace: true,
        state: {
          order: response.order,
          paymentMethod: form.paymentMethod,
        },
      });
    } catch (error) {
      console.error('Checkout failed:', error);
      setMessage(error.response?.data?.message || 'Unable to create the order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (cart.pendingOrderId) return <Navigate to={`/payments/checkout/${cart.pendingOrderId}`} replace />;
  if (!items.length) return <Navigate to="/cart" replace />;

  return (
    <>
      <RoleNavbar hideCart />

      <main className="checkout-page conmat-page-shell">

        {/* HERO */}
        <section className="checkout-hero conmat-page-hero">
          <div>
            <span>Confirm Order</span>
            <h1>Confirm your material order.</h1>
            <p>Review your order items and total before continuing to payment.</p>
          </div>
        </section>

        {/* ACTIONS */}
        <div className="checkout-actions">
          <Link to="/cart">
            <ArrowLeft size={16} />
            Back to Cart
          </Link>
        </div>

        {/* CHECKOUT FORM */}
        <form className="checkout-layout" onSubmit={handleSubmit}>

          {/* ORDER ITEMS */}
          <section className="checkout-card">
            <div className="checkout-card__head">
              <span>Step 1</span>
              <h2>Order Items</h2>
            </div>

            <div className="checkout-items">
              {items.map((item) => {
                const custom = itemCustom[item.productId] || {};
                const itemEstimate = estimateDeliveryWindow(
                  (custom.useCustom && custom.city) || form.city,
                  [item.sellerCity]
                );
                return (
                  <article className="checkout-item" key={item.cartKey || item.id}>
                    <div className="checkout-item__top">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          onError={(event) => { event.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="checkout-item__placeholder">
                          {item.name?.charAt(0) || 'P'}
                        </div>
                      )}

                      <div className="checkout-item__details">
                        <div className="checkout-item__header-line">
                          <h3>{item.name}</h3>
                          <strong>{formatCurrency(item.lineTotal)}</strong>
                        </div>
                        <dl className="checkout-item__meta">
                          <div>
                            <dt>Seller</dt>
                            <dd>{item.sellerName} {item.sellerCity ? `(${item.sellerCity})` : ''}</dd>
                          </div>
                          <div>
                            <dt>Est Time</dt>
                            <dd>{itemEstimate}</dd>
                          </div>
                          <div>
                            <dt>Delivery</dt>
                            <dd>{item.deliveryCharge > 0 ? formatCurrency(item.deliveryCharge) : 'Free'}</dd>
                          </div>
                        </dl>
                        <p>{item.quantity} {item.unit} · {formatCurrency(item.price)} each</p>
                      </div>
                    </div>

                    {/* Optional per-product delivery address */}
                    <div className="checkout-item__customization">
                      <div className="checkout-item__alt-address-section">
                        <button
                          type="button"
                          className={`checkout-item__alt-toggle ${custom.useCustom ? 'is-active' : ''}`}
                          onClick={() => handleToggleCustomAddress(item.productId)}
                        >
                          {custom.useCustom ? '✓ Ship to custom address' : '+ Ship to a different address/recipient'}
                        </button>

                        {custom.useCustom && (
                          <div className="checkout-item__alt-fields">
                            <input
                              type="text"
                              placeholder="Delivery Address for this product"
                              value={custom.address || ''}
                              onChange={(e) => handleItemCustomChange(item.productId, 'address', e.target.value)}
                              required
                            />
                            <div className="checkout-item__alt-row">
                              <select
                                value={custom.city || ''}
                                onChange={(e) => handleItemCustomChange(item.productId, 'city', e.target.value)}
                                required
                              >
                                <option value="">Select City</option>
                                {cityOptionsWithCurrent(custom.city || form.city).map((city) => (
                                  <option key={city} value={city}>{city}</option>
                                ))}
                              </select>
                              <input
                                type="text"
                                placeholder="Recipient Phone"
                                value={custom.phone || ''}
                                onChange={(e) => handleItemCustomChange(item.productId, 'phone', e.target.value)}
                                required
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <label className="checkout-item__note-field">
                        <span>Delivery note for this product (optional):</span>
                        <textarea
                          rows="2"
                          maxLength="1000"
                          placeholder="e.g. Unload at back gate or call before dispatch"
                          value={custom.note || ''}
                          onChange={(event) => handleItemCustomChange(item.productId, 'note', event.target.value)}
                        />
                      </label>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* ORDER SUMMARY */}
          <aside className="checkout-summary">
            <div className="checkout-card__head">
              <span>Step 2</span>
              <h2>Order Summary</h2>
            </div>

            <div className="checkout-summary__rows">
              <p><span>Subtotal ({items.length} items)</span><strong>{formatCurrency(totals.subtotal)}</strong></p>
              {totals.discount > 0 && <p><span>Wholesale Discount</span><strong>-{formatCurrency(totals.discount)}</strong></p>}
              <p><span>Total Delivery Fee</span><strong>{totals.deliveryFee === 0 ? 'Free' : formatCurrency(totals.deliveryFee)}</strong></p>
              <p><span>Unique Sellers</span><strong>{uniqueSellers.length} {uniqueSellers.length === 1 ? 'Seller' : 'Sellers (Independent Fulfillment)'}</strong></p>
              <p><span>Delivery Estimates</span><strong>{items.length === 1 ? deliveryEstimate : 'Shown on each product'}</strong></p>
              <p className="checkout-summary__total"><span>Total Payable</span><strong>{formatCurrency(totals.total)}</strong></p>
            </div>

            {uniqueSellers.length > 1 && (
              <div className="checkout-summary__multiseller-notice">
                <strong>Multi-Seller Order</strong>
                <p>Each seller fulfills their products independently. You can track and confirm delivery for each seller separately.</p>
              </div>
            )}

            {message && <div className="checkout-alert">{message}</div>}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-orange-cta py-2 px-4 fw-bold text-white w-100"
            >
              {loading ? 'Creating Order...' : 'Confirm Order & Proceed to Payment'}
            </button>

            <small className="checkout-summary__escrow-note">
              <strong>ConMat Escrow Protection:</strong> Your payment is held securely. Each seller’s payout is released only when you confirm receipt of their items, or automatically 24 hours after delivery if no issue is reported.
            </small>
          </aside>

        </form>

      </main>
    </>
  );
}
