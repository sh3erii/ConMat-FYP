require('dotenv').config();

const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { usersDB } = require('../config/database');

const hostedUrlKeys = [
  'DATABASE_URL',
  'USERS_DB_URL',
  'PRODUCTS_DB_URL',
  'ORDERS_DB_URL',
  'PAYMENTS_DB_URL',
  'BIDS_DB_URL',
];

const activeHostedUrl = hostedUrlKeys.find((key) => String(process.env[key] || '').trim());
const databaseHost = String(process.env.DB_HOST || 'localhost').trim().toLowerCase();
const localHosts = new Set(['localhost', '127.0.0.1', '::1']);

if (activeHostedUrl || !localHosts.has(databaseHost)) {
  console.error('Refusing to seed an admin because the configured users database is not local.');
  process.exit(1);
}

const name = String(process.env.LOCAL_ADMIN_NAME || '').trim();
const email = String(process.env.LOCAL_ADMIN_EMAIL || '').trim().toLowerCase();
const password = String(process.env.LOCAL_ADMIN_PASSWORD || '');

if (!name || !email || !password) {
  console.error('LOCAL_ADMIN_NAME, LOCAL_ADMIN_EMAIL, and LOCAL_ADMIN_PASSWORD are required.');
  process.exit(1);
}

const strongPassword = password.length >= 8
  && /[a-z]/.test(password)
  && /[A-Z]/.test(password)
  && /\d/.test(password)
  && /[^A-Za-z0-9]/.test(password);

if (!strongPassword) {
  console.error('LOCAL_ADMIN_PASSWORD must be at least 8 characters and include upper-case, lower-case, numeric, and special characters.');
  process.exit(1);
}

async function seedLocalAdmin() {
  await usersDB.authenticate();
  await User.sync();

  const passwordHash = await bcrypt.hash(password, 12);
  const [admin, created] = await User.findOrCreate({
    where: { email },
    defaults: {
      name,
      email,
      passwordHash,
      role: 'Admin',
      status: 'Active',
      verificationStatus: 'NotRequired',
    },
  });

  if (!created) {
    await admin.update({
      name,
      passwordHash,
      role: 'Admin',
      status: 'Active',
      verificationStatus: 'NotRequired',
    });
  }

  console.log(`${created ? 'Created' : 'Updated'} local admin account: ${email}`);
}

seedLocalAdmin()
  .then(() => usersDB.close())
  .catch(async (error) => {
    console.error(`Unable to seed local admin: ${error.message}`);
    await usersDB.close().catch(() => {});
    process.exit(1);
  });
