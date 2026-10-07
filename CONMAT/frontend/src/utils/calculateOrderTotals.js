const amount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function calculateItemDelivery(item) {
  const deliveryCharge = Math.max(0, amount(item?.deliveryCharge));
  const freeFrom = item?.freeDeliveryMinQuantity == null || item.freeDeliveryMinQuantity === ''
    ? null
    : Math.max(1, Math.floor(amount(item.freeDeliveryMinQuantity)));
  const quantity = Math.max(0, Math.floor(amount(item?.quantity)));

  return deliveryCharge === 0 || (freeFrom && quantity >= freeFrom) ? 0 : deliveryCharge;
}

export function calculateWholesaleDiscount(item) {
  const sellerRole = String(item?.sellerRole || '').trim().toLowerCase();
  const isWholesalerListing = sellerRole === 'wholesaler' || item?.pricingModel === 'tiered';
  const usesWholesalePrice = String(item?.pricingType || '').toLowerCase() === 'wholesale';
  const retailPrice = amount(item?.retailPrice);
  const unitPrice = amount(item?.unitPrice ?? item?.price);
  const quantity = Math.max(0, Math.floor(amount(item?.quantity)));

  return isWholesalerListing && usesWholesalePrice && retailPrice > unitPrice
    ? (retailPrice - unitPrice) * quantity
    : 0;
}

export function calculateOrderTotals(items = []) {
  const chargedSubtotal = items.reduce((sum, item) => {
    const lineTotal = item?.lineTotal == null
      ? amount(item?.unitPrice ?? item?.price) * amount(item?.quantity)
      : amount(item.lineTotal);
    return sum + lineTotal;
  }, 0);
  const discount = items.reduce((sum, item) => sum + calculateWholesaleDiscount(item), 0);
  const subtotal = chargedSubtotal + discount;
  const shippingFee = items.reduce((sum, item) => sum + calculateItemDelivery(item), 0);

  return {
    subtotal,
    chargedSubtotal,
    discount,
    wholesaleDiscount: discount,
    shippingFee,
    deliveryFee: shippingFee,
    total: subtotal - discount + shippingFee,
  };
}
