// ============================================================
//  config/db.users.js  (Hafiz Abdul Rehman – 077011)
//  Sequelize connection for users_db (PostgreSQL)
// ============================================================
const { Sequelize } = require('sequelize');
require('dotenv').config();

const usersDB = new Sequelize(
  process.env.USERS_DB_NAME,   // users_db
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host:    process.env.DB_HOST || 'localhost',
    port:    process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,  // set to console.log to debug SQL queries
    pool: {
      max:     5,
      min:     0,
      acquire: 30000,
      idle:    10000
    }
  }
);

// Test connection
(async () => {
  try {
    await usersDB.authenticate();
    console.log('✅ users_db connected successfully.');
  } catch (err) {
    console.error('❌ users_db connection failed:', err.message);
  }
})();

module.exports = usersDB;
