// ============================================================
//  config/db.orders.js  (Muhammad Nosherwan – 076926)
//  Sequelize connection for orders_db (PostgreSQL)
// ============================================================
const { Sequelize } = require('sequelize');
require('dotenv').config();

const ordersDB = new Sequelize(
  process.env.ORDERS_DB_NAME,   // orders_db
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host:    process.env.DB_HOST || 'localhost',
    port:    process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
  }
);

(async () => {
  try {
    await ordersDB.authenticate();
    console.log('✅ orders_db connected successfully.');
  } catch (err) {
    console.error('❌ orders_db connection failed:', err.message);
  }
})();

module.exports = ordersDB;
