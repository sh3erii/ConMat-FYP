const { validateRequired } = require('../utils/validateRequest');

const validateCheckoutOrder = (body) => {
  const errors = validateRequired(body, ['buyerId', 'shippingAddress', 'paymentMethod']);

  if (!Array.isArray(body.items) || body.items.length === 0) {
    errors.push({ field: 'items', message: 'At least one order item is required' });
  }

  (body.items || []).forEach((item, index) => {
    if (!item.productId) errors.push({ field: `items[${index}].productId`, message: 'Product ID is required' });
    if (!item.quantity || Number(item.quantity) <= 0) errors.push({ field: `items[${index}].quantity`, message: 'Quantity must be greater than zero' });
  });

  return errors;
};

const validateOrderStatusUpdate = (body) => {
  const errors = validateRequired(body, ['status']);
  const allowed = ['Pending', 'Confirmed', 'Processing', 'Dispatched', 'Delivered', 'Cancelled'];
  if (body.status && !allowed.includes(body.status)) {
    errors.push({ field: 'status', message: `Status must be one of: ${allowed.join(', ')}` });
  }
  return errors;
};

module.exports = { validateCheckoutOrder, validateOrderStatusUpdate };
