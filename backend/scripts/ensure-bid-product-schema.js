require('dotenv').config();
require('../models');

const { bidsDB, ensureBidProductSchema } = require('../config/database');

(async () => {
  try {
    await bidsDB.authenticate();
    await ensureBidProductSchema();
    console.log('Bid product schema is ready.');
  } catch (error) {
    console.error(`Bid product schema migration failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await bidsDB.close().catch(() => {});
  }
})();
