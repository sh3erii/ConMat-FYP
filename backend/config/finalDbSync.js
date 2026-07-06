const REQUIRED_DATABASES = [
  { key: 'USERS_DB_URL', owner: 'Rehman', module: 'Auth and User Management' },
  { key: 'PRODUCTS_DB_URL', owner: 'Rehman', module: 'Product and Inventory' },
  { key: 'ORDERS_DB_URL', owner: 'Rehman', module: 'Order and Checkout' },
  { key: 'PAYMENTS_DB_URL', owner: 'Nosherwan', module: 'Payment and Invoice' },
  { key: 'BIDS_DB_URL', owner: 'Nosherwan', module: 'Bidding' },
];

function getDatabaseReadiness(env = process.env) {
  return REQUIRED_DATABASES.map((db) => ({
    ...db,
    configured: Boolean(env[db.key]),
    valuePreview: env[db.key] ? env[db.key].replace(/:\/\/.*?:.*?@/, '://***:***@') : 'missing',
  }));
}

function getMissingDatabaseKeys(env = process.env) {
  return getDatabaseReadiness(env)
    .filter((item) => !item.configured)
    .map((item) => item.key);
}

module.exports = {
  REQUIRED_DATABASES,
  getDatabaseReadiness,
  getMissingDatabaseKeys,
};
