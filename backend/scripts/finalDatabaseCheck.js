require('dotenv').config();
const { getDatabaseReadiness, getMissingDatabaseKeys } = require('../config/finalDbSync');

function runFinalDatabaseCheck() {
  const readiness = getDatabaseReadiness();
  const missing = getMissingDatabaseKeys();

  console.log('\nConMat Final PostgreSQL Configuration Check');
  console.log('==========================================');

  readiness.forEach((item) => {
    const icon = item.configured ? 'OK' : 'MISSING';
    console.log(`${icon} ${item.key} — ${item.module} (${item.owner})`);
  });

  if (missing.length) {
    console.log('\nMissing environment keys:');
    missing.forEach((key) => console.log(`- ${key}`));
    console.log('\nCopy backend/env.final.example into .env and fill values.');
    process.exitCode = 1;
    return;
  }

  console.log('\nAll final database URLs are configured. Now run migrations/sync and npm run dev.');
}

runFinalDatabaseCheck();
