const getPing = () => ({
  success: true,
  message: 'ConMat final API check is running',
  day: 14,
  timestamp: new Date().toISOString(),
});

const getModuleReadiness = () => ({
  success: true,
  message: 'Final owned-module readiness list',
  modules: [
    { id: 1, module: 'Auth', endpoint: '/api/auth/login', owner: 'Rehman', status: 'ready', note: 'JWT and role login should be tested again.' },
    { id: 2, module: 'Products', endpoint: '/api/products', owner: 'Rehman', status: 'ready', note: 'Product CRUD and image upload should be tested.' },
    { id: 3, module: 'Inventory', endpoint: '/api/supplier/inventory', owner: 'Rehman', status: 'ready', note: 'Stock updates and low stock alerts should be tested.' },
    { id: 4, module: 'Orders', endpoint: '/api/orders', owner: 'Rehman', status: 'ready', note: 'Order history and status timeline should be tested.' },
    { id: 5, module: 'Checkout', endpoint: '/api/checkout/place-order', owner: 'Rehman', status: 'ready', note: 'Checkout validation must reject empty carts.' },
  ],
});

const getValidationChecklist = () => ({
  success: true,
  checklist: [
    'Product create requires name, category, unit and prices.',
    'Wholesale price cannot be greater than retail price.',
    'Stock must be numeric and positive.',
    'Checkout requires buyerId, items, shippingAddress and paymentMethod.',
    'Order status must use allowed values only.',
  ],
});

module.exports = { getPing, getModuleReadiness, getValidationChecklist };
