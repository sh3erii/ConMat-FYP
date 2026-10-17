const normalizeRole = (role) => String(role || '').trim().toLowerCase();
const amount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function pricingModelForRole(role) {
  const normalized = normalizeRole(role);
  if (normalized === 'retailer') return 'retail';
  if (normalized === 'supplier') return 'minimum';
  return 'tiered';
}

function resolveProductPricing(product, sellerRole, quantity = 1) {
  const role = normalizeRole(sellerRole);
  const qty = Math.max(1, Math.floor(amount(quantity) || 1));
  const minimum = Math.max(1, Math.floor(amount(product.minWholesaleQty) || 1));

  if (role === 'retailer') {
    const unitPrice = amount(product.retailPrice);
    return { pricingModel: 'retail', pricingType: 'retail', quantity: qty, unitPrice, minimumQuantity: 1, meetsMinimum: true };
  }

  if (role === 'supplier') {
    const unitPrice = amount(product.wholesalePrice ?? product.retailPrice);
    return { pricingModel: 'minimum', pricingType: 'wholesale', quantity: qty, unitPrice, minimumQuantity: minimum, meetsMinimum: qty >= minimum };
  }

  const wholesale = qty >= minimum;
  const unitPrice = wholesale ? amount(product.wholesalePrice) : amount(product.retailPrice);
  return { pricingModel: 'tiered', pricingType: wholesale ? 'wholesale' : 'retail', quantity: qty, unitPrice, minimumQuantity: minimum, meetsMinimum: true };
}

module.exports = { pricingModelForRole, resolveProductPricing };
