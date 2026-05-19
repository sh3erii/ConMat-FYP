// ============================================================
//  config/db.payments.js  (Muhammad Nosherwan – 076926)
//  Sequelize connection for payments_db (PostgreSQL)
// ============================================================
const { Sequelize } = require('sequelize');
require('dotenv').config();

const paymentsDB = new Sequelize(
  process.env.PAYMENTS_DB_NAME,  // payments_db
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
    await paymentsDB.authenticate();
    console.log('✅ payments_db connected successfully.');
  } catch (err) {
    console.error('❌ payments_db connection failed:', err.message);
  }
})();

module.exports = paymentsDB;
