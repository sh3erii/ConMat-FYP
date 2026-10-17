require('dotenv').config();

const { ordersDB, ensureCheckoutTokenSchema } = require('../config/database');

async function run() {
  try {
    await ordersDB.authenticate();
    await ensureCheckoutTokenSchema();
    console.log('Checkout token schema is ready in ordersDB.');
  } finally {
    await ordersDB.close();
  }
}

run().catch((error) => {
  console.error(`Checkout token migration failed: ${error.message}`);
  process.exitCode = 1;
});

