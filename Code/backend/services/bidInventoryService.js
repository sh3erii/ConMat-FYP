const Product = require('../models/Product');

const normalized = (value) => String(value || '').trim().toLowerCase();

function bidProductIssue(product, { sellerId, request }) {
  if (!product || product.sellerId !== sellerId) {
    return 'Select a product from your own inventory for this bid.';
  }
  if (product.status !== 'Active') {
    return `${product.name} is not an active marketplace product.`;
  }
  if (request.category && normalized(product.category) !== normalized(request.category)) {
    return `${product.name} does not match the requested ${request.category} category.`;
  }
  if (normalized(product.unit) !== normalized(request.unit)) {
    return `${product.name} is sold by ${product.unit}, but this request requires ${request.unit}.`;
  }
  const requiredQuantity = Math.max(1, Math.floor(Number(request.requiredQuantity) || 0));
  if (Number(product.stock) < requiredQuantity) {
    return `${product.name} has only ${product.stock} ${product.unit} available; ${requiredQuantity} are required.`;
  }
  return '';
}

async function requireBidInventoryProduct({ productId, sellerId, request }) {
  if (!productId) {
    throw Object.assign(new Error('Select an inventory product before submitting this bid.'), { status: 400 });
  }
  const product = await Product.findByPk(productId);
  const issue = bidProductIssue(product, { sellerId, request });
  if (issue) throw Object.assign(new Error(issue), { status: 409 });
  return product;
}

const publicBidProduct = (product) => product ? ({
  productId: product.id,
  productName: product.name,
  productCategory: product.category,
  productUnit: product.unit,
  productStock: Number(product.stock),
  productStatus: product.status,
}) : ({
  productName: 'Inventory product unavailable',
  productCategory: null,
  productUnit: null,
  productStock: 0,
  productStatus: 'Unavailable',
});

module.exports = { bidProductIssue, requireBidInventoryProduct, publicBidProduct };
