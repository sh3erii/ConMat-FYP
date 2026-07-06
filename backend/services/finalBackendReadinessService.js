const { getDatabaseReadiness, getMissingDatabaseKeys } = require('../config/finalDbSync');

const rehmanModules = [
  {
    name: 'Authentication',
    status: 'ready-for-final-test',
    checks: ['register', 'login', 'jwt middleware', 'role middleware'],
  },
  {
    name: 'Product and Inventory',
    status: 'ready-for-final-test',
    checks: ['product CRUD', 'Multer upload', 'stock update', 'pricing slabs'],
  },
  {
    name: 'Order and Checkout',
    status: 'ready-for-final-test',
    checks: ['checkout create order', 'order history', 'order detail', 'timeline', 'cancel order'],
  },
  {
    name: 'Integration Cleanup',
    status: 'ready-for-final-test',
    checks: ['consistent response', 'validation middleware', 'not found handler', 'request logger'],
  },
];

function getHealth() {
  return {
    ok: true,
    moduleOwner: 'Hafiz Abdul Rehman',
    day: 15,
    message: 'Final backend readiness endpoint is working.',
    timestamp: new Date().toISOString(),
  };
}

function getModules() {
  return {
    owner: 'Hafiz Abdul Rehman',
    modules: rehmanModules,
  };
}

function getDatabasePlan() {
  const readiness = getDatabaseReadiness();
  const missing = getMissingDatabaseKeys();

  return {
    database: 'PostgreSQL',
    orm: 'Sequelize',
    readiness,
    missing,
    ready: missing.length === 0,
  };
}

module.exports = {
  getHealth,
  getModules,
  getDatabasePlan,
};
