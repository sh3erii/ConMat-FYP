import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { calculateOrderTotals } from '../utils/calculateOrderTotals';
import { getWholesaleMinimum, resolveProductPricing } from '../utils/productPricing';
import { useAuth } from './AuthContext';
const CartContext = createContext(null);
const STORAGE_KEY = 'conmat_cart_items';
const CHECKOUT_TOKEN_KEY = 'conmat_cart_checkout_token';
const PENDING_ORDER_KEY = 'conmat_cart_pending_order_id';

const parseCart = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CHECKOUT_TOKEN_KEY);
    localStorage.removeItem(PENDING_ORDER_KEY);
    return [];
  }
};

const createCheckoutToken = () => globalThis.crypto?.randomUUID?.()
  || `checkout_${Date.now()}_${Math.random().toString(36).slice(2)}`;

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState(parseCart);
  const [pendingOrderId, setPendingOrderId] = useState(() => localStorage.getItem(PENDING_ORDER_KEY) || '');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = (product, quantity = 1) => {
    if (pendingOrderId) {
      return { ok: false, message: 'This cart already belongs to a pending order. Complete or cancel that order before adding more products.' };
    }
    const sellerId = product.sellerId || product.seller?.id;
    if (user?.id && sellerId && String(user.id) === String(sellerId)) {
      return { ok: false, message: 'This is your product. You cannot add your own listing to the cart.' };
    }
    const sellerRole = String(product.sellerRole || product.seller?.role || '').toLowerCase();
    const supplierListing = product.pricingModel === 'minimum' || sellerRole === 'supplier';
    const wholesalerListing = product.pricingModel === 'tiered' || sellerRole === 'wholesaler';
    const wholesaleMinimum = getWholesaleMinimum(product);
    const minQuantity = supplierListing ? wholesaleMinimum : 1;
    const requestedQuantity = Number(quantity);
    const stock = Math.max(0, Math.floor(Number(product.stock || 0)));
    const initialPricing = resolveProductPricing(product, sellerRole, requestedQuantity);
    const cartKey = wholesalerListing
      ? `${product.id}-tiered`
      : `${product.id}-${initialPricing.pricingType}`;
    if (!Number.isInteger(requestedQuantity) || requestedQuantity < minQuantity) {
      return { ok: false, message: `Minimum quantity is ${minQuantity} ${product.unit || 'units'}.` };
    }
    if (requestedQuantity > stock) {
      return { ok: false, message: `Maximum available quantity is ${stock} ${product.unit || 'units'}.` };
    }

    const quantityAlreadyInCart = items
      .filter((item) => String(item.productId) === String(product.id))
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    if (quantityAlreadyInCart + requestedQuantity > stock) {
      const remaining = Math.max(0, stock - quantityAlreadyInCart);
      return {
        ok: false,
        message: remaining
          ? `Your cart already contains ${quantityAlreadyInCart}. You can add at most ${remaining} more.`
          : `Your cart already contains the maximum available quantity (${stock}).`,
      };
    }

    setItems((current) => {
      const matchesProduct = (item) => wholesalerListing
        ? String(item.productId) === String(product.id)
        : item.cartKey === cartKey;
      const existingItems = current.filter(matchesProduct);
      const nextQuantity = requestedQuantity + existingItems.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
      );
      const appliedPricing = resolveProductPricing(product, sellerRole, nextQuantity);
      const cartItem = {
          ...(existingItems[0] || {}),
          cartKey,
          productId: product.id,
          sellerId,
          sellerRole: product.sellerRole || product.seller?.role,
          sellerName: product.sellerName || product.seller?.businessName || product.seller?.companyName || product.seller?.name,
          name: product.name,
          category: product.category,
          brand: product.brand,
          unit: product.unit,
          city: product.city,
          sellerCity: product.seller?.city || product.city,
          imageUrl: product.imageUrl,
          stock,
          minQuantity,
          pricingModel: appliedPricing.pricingModel,
          pricingType: appliedPricing.pricingType,
          unitPrice: appliedPricing.unitPrice,
          retailPrice: resolveProductPricing(product, 'retailer', 1).unitPrice,
          wholesalePrice: resolveProductPricing(product, 'wholesaler', wholesaleMinimum).unitPrice,
          wholesaleMinimum,
          deliveryCharge: Number(product.deliveryCharge || 0),
          freeDeliveryMinQuantity: product.freeDeliveryMinQuantity == null ? null : Number(product.freeDeliveryMinQuantity),
          quantity: nextQuantity,
      };

      return [...current.filter((item) => !matchesProduct(item)), cartItem];
    });
    return { ok: true, quantity: requestedQuantity };
  };

  const updateQuantity = (cartKey, quantity) => {
    setItems((current) => current.map((item) => (
      item.cartKey === cartKey ? (() => {
        const minimum = Math.max(1, Number(item.minQuantity || 1));
        const safeQuantity = Math.max(minimum, Math.floor(Number(quantity || minimum)));
        const nextQuantity = Math.min(item.stock || safeQuantity, safeQuantity);
        const isTiered = item.pricingModel === 'tiered' || String(item.sellerRole || '').toLowerCase() === 'wholesaler';
        const hasTierPrices = item.retailPrice != null && item.wholesalePrice != null;

        if (!isTiered || !hasTierPrices) return { ...item, quantity: nextQuantity };

        const appliedPricing = resolveProductPricing({
          pricingModel: 'tiered',
          retailPrice: item.retailPrice,
          wholesalePrice: item.wholesalePrice,
          minWholesaleQty: item.wholesaleMinimum,
        }, 'wholesaler', nextQuantity);

        return {
          ...item,
          quantity: nextQuantity,
          pricingType: appliedPricing.pricingType,
          unitPrice: appliedPricing.unitPrice,
        };
      })() : item
    )));
  };

  const removeFromCart = (cartKey) => {
    setItems((current) => current.filter((item) => item.cartKey !== cartKey));
  };

  const clearCart = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CHECKOUT_TOKEN_KEY);
    localStorage.removeItem(PENDING_ORDER_KEY);
    setItems([]);
    setPendingOrderId('');
  }, []);

  const ensureCheckoutToken = useCallback(() => {
    const existing = localStorage.getItem(CHECKOUT_TOKEN_KEY);
    if (existing) return existing;
    const token = createCheckoutToken();
    localStorage.setItem(CHECKOUT_TOKEN_KEY, token);
    return token;
  }, []);

  const associatePendingOrder = useCallback((orderId) => {
    const value = String(orderId || '').trim();
    if (!value) return;
    localStorage.setItem(PENDING_ORDER_KEY, value);
    setPendingOrderId(value);
  }, []);

  const releasePendingOrder = useCallback(() => {
    localStorage.removeItem(PENDING_ORDER_KEY);
    setPendingOrderId('');
  }, []);

  const totals = useMemo(() => {
    const calculated = calculateOrderTotals(items);

    return {
      ...calculated,
      count: items.length
    };
  }, [items]);

  const value = {
    items,
    totals,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    ensureCheckoutToken,
    associatePendingOrder,
    releasePendingOrder,
    pendingOrderId
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => useContext(CartContext);
