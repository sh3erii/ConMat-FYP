const ApiHealthCheckLog = require('../models/ApiHealthCheckLog');

const moduleReadiness = [
  { module: 'Auth', endpoint: '/api/auth/login', owner: 'Rehman', status: 'ready' },
  { module: 'Product & Inventory', endpoint: '/api/products', owner: 'Rehman', status: 'ready' },
  { module: 'Orders', endpoint: '/api/orders', owner: 'Rehman', status: 'ready' },
  { module: 'Checkout', endpoint: '/api/checkout', owner: 'Rehman', status: 'ready' },
  { module: 'Order Tracking', endpoint: '/api/order-tracking', owner: 'Rehman', status: 'ready' },
];

const getPing = () => ({
  success: true,
  message: 'ConMat backend is running',
  serverTime: new Date().toISOString(),
  database: 'PostgreSQL',
});

const getModuleReadiness = () => ({
  success: true,
  modules: moduleReadiness,
});

const writeHealthLog = async ({ moduleName, endpoint, status, message, responseTimeMs }) => {
  try {
    return await ApiHealthCheckLog.create({ moduleName, endpoint, status, message, responseTimeMs });
  } catch (error) {
    return null;
  }
};

module.exports = { getPing, getModuleReadiness, writeHealthLog };
