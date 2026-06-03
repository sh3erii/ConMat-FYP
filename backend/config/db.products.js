const { Sequelize } = require('sequelize');
require('dotenv').config();

const productsDB = new Sequelize(
  process.env.PRODUCTS_DB_NAME,  // products_db
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host:    process.env.DB_HOST || 'localhost',
    port:    process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    pool: {
      max:     5,
      min:     0,
      acquire: 30000,
      idle:    10000
    }
  }
);

(async () => {
  try {
    await productsDB.authenticate();
    console.log('✅ products_db connected successfully.');
  } catch (err) {
    console.error('❌ products_db connection failed:', err.message);
  }
})();

module.exports = productsDB;
