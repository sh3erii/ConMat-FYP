const path = require('path');
const dotenv = require('dotenv');

const databaseMode = String(process.argv[2] || '').trim().toLowerCase();
if (!['local', 'neon'].includes(databaseMode)) {
  console.error('Usage: node scripts/run-with-env.js <local|neon>');
  process.exit(1);
}

const environmentPath = path.resolve(__dirname, '..', '.env');
const result = dotenv.config({ path: environmentPath, override: true });
if (result.error) {
  console.error(`Unable to load environment file: ${environmentPath}`);
  process.exit(1);
}

process.env.DB_MODE = databaseMode;
if (databaseMode === 'local') {
  process.env.DB_SSL = process.env.LOCAL_DB_SSL || 'false';
}

const { start } = require('../server');
start().catch((error) => {
  console.error('Startup failed:', error.message);
  process.exit(1);
});
