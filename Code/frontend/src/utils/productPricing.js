const normalizeRole = (role) => String(role || '').trim().toLowerCase();

const amount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getWholesaleMinimum = (product = {}) => Math.max(
  1,
  Math.floor(amount(
    product.minWholesaleQty
      ?? product.wholesaleMinimum
      ?? product.minimumOrderQty
      ?? 1
  ) || 1)
);

export const getProductStockHealth = (product = {}) => {
  const stock = Math.max(0, Math.floor(amount(product.stock)));
  const minimumQuantity = getWholesaleMinimum(product);
  const normalizedStatus = String(product.status || '').replace(/[\s_-]/g, '').toLowerCase();
  const status = stock === 0 || normalizedStatus === 'outofstock'
    ? 'out'
    : stock < minimumQuantity
      ? 'low'
      : 'healthy';

  return {
    stock,
    minimumQuantity,
    status,
    isOutOfStock: status === 'out',
    isLowStock: status === 'low',
    isHealthy: status === 'healthy',
  };
};

const roleForProduct = (product, sellerRole) => {
  const role = normalizeRole(sellerRole);
  if (['supplier', 'wholesaler', 'retailer'].includes(role)) return role;
  if (product?.pricingModel === 'minimum') return 'supplier';
  if (product?.pricingModel === 'retail') return 'retailer';
  return 'wholesaler';
};

export function resolveProductPricing(product = {}, sellerRole, quantity = 1) {
  const role = roleForProduct(product, sellerRole);
  const qty = Math.max(1, Math.floor(amount(quantity) || 1));
  const minimum = getWholesaleMinimum(product);

  if (role === 'retailer') {
    const unitPrice = amount(product.retailPrice ?? product.price ?? product.wholesalePrice);
    return {
      pricingModel: 'retail',
      pricingType: 'retail',
      quantity: qty,
      unitPrice,
      minimumQuantity: 1,
      meetsMinimum: true,
    };
  }

  if (role === 'supplier') {
    const unitPrice = amount(product.wholesalePrice ?? product.price ?? product.retailPrice);
    return {
      pricingModel: 'minimum',
      pricingType: 'wholesale',
      quantity: qty,
      unitPrice,
      minimumQuantity: minimum,
      meetsMinimum: qty >= minimum,
    };
  }

  const wholesale = qty >= minimum;
  const unitPrice = wholesale
    ? amount(product.wholesalePrice ?? product.price ?? product.retailPrice)
    : amount(product.retailPrice ?? product.price ?? product.wholesalePrice);

  return {
    pricingModel: 'tiered',
    pricingType: wholesale ? 'wholesale' : 'retail',
    quantity: qty,
    unitPrice,
    minimumQuantity: minimum,
    meetsMinimum: true,
  };
}
