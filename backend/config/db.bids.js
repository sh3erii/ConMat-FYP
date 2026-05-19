// ============================================================
//  config/db.bids.js  (Muhammad Nosherwan – 076926)
//  Sequelize connection for bids_db (PostgreSQL)
// ============================================================
const { Sequelize } = require('sequelize');
require('dotenv').config();

const bidsDB = new Sequelize(
  process.env.BIDS_DB_NAME,   // bids_db
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
    await bidsDB.authenticate();
    console.log('✅ bids_db connected successfully.');
  } catch (err) {
    console.error('❌ bids_db connection failed:', err.message);
  }
})();

module.exports = bidsDB;
