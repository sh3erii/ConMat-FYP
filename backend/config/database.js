const { Sequelize } = require('sequelize');
const dns = require('dns');
require('dotenv').config();

const bool = (value, fallback = false) => value == null ? fallback : String(value).toLowerCase() === 'true';
const positiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

// Some networks advertise Neon IPv6 addresses even when outbound IPv6 routing is
// unreliable. Prefer IPv4 for database DNS lookups unless explicitly disabled.
if (bool(process.env.DB_PREFER_IPV4, true) && typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

function makeConnection(label, urlKey, nameKey) {
  const databaseMode = String(process.env.DB_MODE || 'neon').trim().toLowerCase();
  const url = databaseMode === 'local'
    ? null
    : process.env[urlKey] || process.env.DATABASE_URL;
  const ssl = bool(process.env.DB_SSL, process.env.NODE_ENV === 'production');
  const common = {
    dialect: 'postgres',
    logging: bool(process.env.DB_LOG_SQL) ? console.log : false,
    pool: { max: 8, min: 0, acquire: 30000, idle: 10000 },
    dialectOptions: {
      keepAlive: true,
      connectionTimeoutMillis: positiveInteger(process.env.DB_CONNECT_TIMEOUT_MS, 15000),
      ...(ssl ? { ssl: { require: true, rejectUnauthorized: false } } : {})
    }
  };

  if (url) return new Sequelize(url, common);

  return new Sequelize(
    process.env[nameKey] || `conmat_${label}`,
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || '',
    {
      ...common,
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432)
    }
  );
}

const usersDB = makeConnection('users', 'USERS_DB_URL', 'USERS_DB_NAME');
const productsDB = makeConnection('products', 'PRODUCTS_DB_URL', 'PRODUCTS_DB_NAME');
const ordersDB = makeConnection('orders', 'ORDERS_DB_URL', 'ORDERS_DB_NAME');
const paymentsDB = makeConnection('payments', 'PAYMENTS_DB_URL', 'PAYMENTS_DB_NAME');
const bidsDB = makeConnection('bids', 'BIDS_DB_URL', 'BIDS_DB_NAME');

const databases = { usersDB, productsDB, ordersDB, paymentsDB, bidsDB };

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function authenticateWithRetry(label, database) {
  const retries = positiveInteger(process.env.DB_CONNECT_RETRIES, 2);
  const retryDelay = positiveInteger(process.env.DB_CONNECT_RETRY_MS, 1000);
  let lastError;

  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    try {
      await database.authenticate();
      if (attempt > 1) console.log(`Database ${label} connected on attempt ${attempt}.`);
      return;
    } catch (error) {
      lastError = error;
      if (attempt > retries) break;
      const delay = Math.min(retryDelay * (2 ** (attempt - 1)), 10000);
      console.warn(`Database ${label} connection attempt ${attempt} failed: ${error.message}. Retrying in ${delay}ms...`);
      await wait(delay);
    }
  }

  throw new Error(`Unable to connect to database ${label} after ${retries + 1} attempts: ${lastError?.message || 'unknown error'}`, { cause: lastError });
}

async function ensureCheckoutTokenSchema() {
  const orderQueryInterface = ordersDB.getQueryInterface();
  const orderTables = await orderQueryInterface.showAllTables();
  const orderTableNames = orderTables.map((table) => (
    typeof table === 'string' ? table : table.tableName || table.name
  ));
  if (!orderTableNames.includes('orders')) return;

  const orderColumns = await orderQueryInterface.describeTable('orders');
  if (!orderColumns.checkoutToken) {
    await orderQueryInterface.addColumn('orders', 'checkoutToken', { type: Sequelize.STRING(80), allowNull: true });
  }
  const orderIndexes = await orderQueryInterface.showIndex('orders');
  if (!orderIndexes.some((index) => index.fields?.some((field) => field.attribute === 'checkoutToken'))) {
    await orderQueryInterface.addIndex('orders', ['checkoutToken'], { unique: true, name: 'orders_checkout_token_unique' });
  }
}

async function ensureBidProductSchema() {
  const queryInterface = bidsDB.getQueryInterface();
  const tables = await queryInterface.showAllTables();
  const tableNames = tables.map((table) => (
    typeof table === 'string' ? table : table.tableName || table.name
  ));
  if (!tableNames.includes('bid_offers')) return;

  const columns = await queryInterface.describeTable('bid_offers');
  if (!columns.productId) {
    await queryInterface.addColumn('bid_offers', 'productId', {
      type: Sequelize.UUID,
      allowNull: true,
    });
  }
  const indexes = await queryInterface.showIndex('bid_offers');
  if (!indexes.some((index) => index.fields?.some((field) => field.attribute === 'productId'))) {
    await queryInterface.addIndex('bid_offers', ['productId'], { name: 'bid_offers_product_id' });
  }
}

async function ensureOrderFulfillmentSchema() {
  const orderQueryInterface = ordersDB.getQueryInterface();
  const orderTables = await orderQueryInterface.showAllTables();
  const orderTableNames = orderTables.map((table) => (
    typeof table === 'string' ? table : table.tableName || table.name
  ));

  if (orderTableNames.includes('orders')) {
    const orderColumns = await orderQueryInterface.describeTable('orders');
    if (!orderColumns.deliveredAt) {
      await orderQueryInterface.addColumn('orders', 'deliveredAt', { type: Sequelize.DATE, allowNull: true });
    }
    if (!orderColumns.deliveryResponseDeadline) {
      await orderQueryInterface.addColumn('orders', 'deliveryResponseDeadline', { type: Sequelize.DATE, allowNull: true });
    }
    if (!orderColumns.deliveryResolution) {
      await orderQueryInterface.addColumn('orders', 'deliveryResolution', { type: Sequelize.STRING(32), allowNull: true });
    }
  }

  if (orderTableNames.includes('order_items')) {
    const itemColumns = await orderQueryInterface.describeTable('order_items');
    const itemColumnDefinitions = {
      fulfillmentStatus: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'Placed' },
      deliveryAddress: { type: Sequelize.TEXT, allowNull: true },
      deliveryCity: { type: Sequelize.STRING(100), allowNull: true },
      contactPhone: { type: Sequelize.STRING(40), allowNull: true },
      deliveryWindow: { type: Sequelize.STRING(80), allowNull: true },
      deliveryCharge: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      buyerNote: { type: Sequelize.TEXT, allowNull: true },
      sellerNote: { type: Sequelize.TEXT, allowNull: true },
      trackingLocation: { type: Sequelize.STRING(120), allowNull: true },
      deliveredAt: { type: Sequelize.DATE, allowNull: true },
      deliveryResponseDeadline: { type: Sequelize.DATE, allowNull: true },
      deliveryResolution: { type: Sequelize.STRING(32), allowNull: true },
    };
    const addedItemColumns = new Set();
    for (const [column, definition] of Object.entries(itemColumnDefinitions)) {
      if (!itemColumns[column]) {
        await orderQueryInterface.addColumn('order_items', column, definition);
        addedItemColumns.add(column);
      }
    }

    if (addedItemColumns.size) {
      await ordersDB.query(`
        UPDATE "order_items" AS item
        SET
          "deliveryAddress" = COALESCE(item."deliveryAddress", parent."shippingAddress"),
          "deliveryCity" = COALESCE(item."deliveryCity", parent."city"),
          "contactPhone" = COALESCE(item."contactPhone", parent."contactPhone"),
          "deliveryWindow" = COALESCE(item."deliveryWindow", parent."deliveryWindow"),
          "buyerNote" = COALESCE(item."buyerNote", parent."notes"),
          "deliveredAt" = COALESCE(item."deliveredAt", parent."deliveredAt"),
          "deliveryResponseDeadline" = COALESCE(item."deliveryResponseDeadline", parent."deliveryResponseDeadline"),
          "deliveryResolution" = COALESCE(item."deliveryResolution", parent."deliveryResolution")
        FROM "orders" AS parent
        WHERE item."orderId" = parent."id"
      `);
    }
    if (addedItemColumns.has('fulfillmentStatus')) {
      await ordersDB.query(`
        UPDATE "order_items" AS item
        SET "fulfillmentStatus" = CASE
          WHEN parent."paymentStatus" = 'Paid' AND parent."orderStatus" = 'Placed' THEN 'Confirmed'
          ELSE parent."orderStatus"
        END
        FROM "orders" AS parent
        WHERE item."orderId" = parent."id"
      `);
    }
    if (addedItemColumns.has('deliveryCharge')) {
      await ordersDB.query(`
        UPDATE "order_items"
        SET "deliveryCharge" = COALESCE(NULLIF("productSnapshot" ->> 'appliedDeliveryCharge', '')::numeric, 0)
      `);
    }
    const itemIndexes = await orderQueryInterface.showIndex('order_items');
    const indexedItemColumns = new Set(itemIndexes.flatMap((index) => (index.fields || []).map((field) => field.attribute)));
    if (!indexedItemColumns.has('fulfillmentStatus')) {
      await orderQueryInterface.addIndex('order_items', ['fulfillmentStatus'], { name: 'order_items_fulfillment_status' });
    }
    if (!indexedItemColumns.has('deliveryResponseDeadline')) {
      await orderQueryInterface.addIndex('order_items', ['deliveryResponseDeadline'], { name: 'order_items_delivery_response_deadline' });
    }
  }

  if (orderTableNames.includes('order_status_events')) {
    const eventColumns = await orderQueryInterface.describeTable('order_status_events');
    if (!eventColumns.orderItemId) {
      await orderQueryInterface.addColumn('order_status_events', 'orderItemId', { type: Sequelize.UUID, allowNull: true });
    }
    if (!eventColumns.sellerId) {
      await orderQueryInterface.addColumn('order_status_events', 'sellerId', { type: Sequelize.UUID, allowNull: true });
    }
    const eventIndexes = await orderQueryInterface.showIndex('order_status_events');
    const indexedEventColumns = new Set(eventIndexes.flatMap((index) => (index.fields || []).map((field) => field.attribute)));
    if (!indexedEventColumns.has('orderItemId')) {
      await orderQueryInterface.addIndex('order_status_events', ['orderItemId'], { name: 'order_status_events_order_item_id' });
    }
    if (!indexedEventColumns.has('sellerId')) {
      await orderQueryInterface.addIndex('order_status_events', ['sellerId'], { name: 'order_status_events_seller_id' });
    }
  }
}

async function ensureProductCategorySchema() {
  try {
    const productQueryInterface = productsDB.getQueryInterface();
    const productTables = await productQueryInterface.showAllTables();
    const productTableNames = productTables.map((table) => (
      typeof table === 'string' ? table : table.tableName || table.name
    ));
    if (!productTableNames.includes('products')) return;

    await productsDB.query(`ALTER TYPE "enum_products_category" ADD VALUE IF NOT EXISTS 'Marble'`).catch(() => {});
    const columns = await productQueryInterface.describeTable('products');
    if (columns.unit && columns.unit.type !== 'CHARACTER VARYING(50)') {
      await productsDB.query(`ALTER TABLE "products" ALTER COLUMN "unit" TYPE VARCHAR(50) USING "unit"::text`).catch(() => {});
    }
  } catch (err) {
    console.warn('ensureProductCategorySchema non-fatal:', err.message);
  }
}

async function applySafeMigrations() {
  const userQueryInterface = usersDB.getQueryInterface();
  const columns = await userQueryInterface.describeTable('users');
  if (!columns.profilePhoto) {
    await userQueryInterface.addColumn('users', 'profilePhoto', {
      type: Sequelize.STRING,
      allowNull: true
    });
  }
  if (!columns.stripeConnectedAccountId) {
    await userQueryInterface.addColumn('users', 'stripeConnectedAccountId', {
      type: Sequelize.STRING(80),
      allowNull: true,
      unique: true
    });
  }
  if (!columns.stripeDetailsSubmitted) {
    await userQueryInterface.addColumn('users', 'stripeDetailsSubmitted', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  }
  if (!columns.stripePayoutsEnabled) {
    await userQueryInterface.addColumn('users', 'stripePayoutsEnabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  }
  if (!columns.stripeTransfersStatus) {
    await userQueryInterface.addColumn('users', 'stripeTransfersStatus', {
      type: Sequelize.STRING(32),
      allowNull: false,
      defaultValue: 'inactive'
    });
  }
  if (!columns.stripePayoutCountry) {
    await userQueryInterface.addColumn('users', 'stripePayoutCountry', {
      type: Sequelize.STRING(2),
      allowNull: true
    });
  }

  await usersDB.query(`
    UPDATE "users"
    SET "status" = 'Pending'
    WHERE "role" IN ('Supplier', 'Wholesaler', 'Retailer')
      AND "verificationStatus" = 'Pending'
      AND "status" = 'Active'
  `);
  await usersDB.query(`
    UPDATE "users"
    SET "status" = 'Rejected'
    WHERE "role" IN ('Supplier', 'Wholesaler', 'Retailer')
      AND "verificationStatus" = 'Rejected'
      AND "status" <> 'Rejected'
  `);

  const userTables = await userQueryInterface.showAllTables();
  const userTableNames = userTables.map((table) => (
    typeof table === 'string' ? table : table.tableName || table.name
  ));
  if (!userTableNames.includes('pending_registrations')) {
    await userQueryInterface.createTable('pending_registrations', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
      email: { type: Sequelize.STRING(180), allowNull: false, unique: true },
      registrationData: { type: Sequelize.JSONB, allowNull: false },
      passwordHash: { type: Sequelize.STRING, allowNull: false },
      otpHash: { type: Sequelize.STRING, allowNull: false },
      otpExpiresAt: { type: Sequelize.DATE, allowNull: false },
      resendAvailableAt: { type: Sequelize.DATE, allowNull: false },
      attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await userQueryInterface.addIndex('pending_registrations', ['otpExpiresAt']);
  }
  if (!userTableNames.includes('password_reset_otps')) {
    await userQueryInterface.createTable('password_reset_otps', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
      email: { type: Sequelize.STRING(180), allowNull: false, unique: true },
      otpHash: { type: Sequelize.STRING, allowNull: false },
      otpExpiresAt: { type: Sequelize.DATE, allowNull: false },
      resendAvailableAt: { type: Sequelize.DATE, allowNull: false },
      attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await userQueryInterface.addIndex('password_reset_otps', ['otpExpiresAt']);
  }

  const productQueryInterface = productsDB.getQueryInterface();
  const productTables = await productQueryInterface.showAllTables();
  const tableNames = productTables.map((table) => (
    typeof table === 'string' ? table : table.tableName || table.name
  ));

  if (tableNames.includes('products')) {
    const productColumns = await productQueryInterface.describeTable('products');
    if (!productColumns.reviewRequestNote) {
      await productQueryInterface.addColumn('products', 'reviewRequestNote', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }
    if (!productColumns.reviewRequestedAt) {
      await productQueryInterface.addColumn('products', 'reviewRequestedAt', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
    if (!productColumns.deliveryCharge) {
      await productQueryInterface.addColumn('products', 'deliveryCharge', {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      });
    }
    if (!productColumns.withinCityDeliveryCharge) {
      await productQueryInterface.addColumn('products', 'withinCityDeliveryCharge', {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
      });
    }
    if (!productColumns.freeDeliveryMinQuantity) {
      await productQueryInterface.addColumn('products', 'freeDeliveryMinQuantity', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }

    await productsDB.query(`
      UPDATE "products"
      SET "status" = 'OutOfStock'
      WHERE "status" = 'Pending'
        AND "reviewRequestedAt" IS NULL
        AND "stock" = 0
    `);
    await productsDB.query(`
      UPDATE "products"
      SET "status" = 'Active'
      WHERE "status" = 'Pending'
        AND "reviewRequestedAt" IS NULL
        AND "stock" > 0
    `);
  }

  if (!tableNames.includes('product_reports')) {
    await productQueryInterface.createTable('product_reports', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
      productId: { type: Sequelize.UUID, allowNull: false },
      reporterId: { type: Sequelize.UUID, allowNull: false },
      reason: { type: Sequelize.STRING(80), allowNull: false },
      details: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.STRING(24), allowNull: false, defaultValue: 'Pending' },
      adminNote: { type: Sequelize.TEXT, allowNull: true },
      reviewedBy: { type: Sequelize.UUID, allowNull: true },
      reviewedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    await productQueryInterface.addIndex('product_reports', ['productId']);
    await productQueryInterface.addIndex('product_reports', ['reporterId']);
    await productQueryInterface.addIndex('product_reports', ['status']);
  }

  await ensureBidProductSchema();

  const orderQueryInterface = ordersDB.getQueryInterface();
  const orderTables = await orderQueryInterface.showAllTables();
  const orderTableNames = orderTables.map((table) => (
    typeof table === 'string' ? table : table.tableName || table.name
  ));
  if (orderTableNames.includes('orders')) {
    await ensureCheckoutTokenSchema();
    const orderColumns = await orderQueryInterface.describeTable('orders');
    if (!orderColumns.deliveredAt) {
      await orderQueryInterface.addColumn('orders', 'deliveredAt', { type: Sequelize.DATE, allowNull: true });
    }
    if (!orderColumns.deliveryResponseDeadline) {
      await orderQueryInterface.addColumn('orders', 'deliveryResponseDeadline', { type: Sequelize.DATE, allowNull: true });
      await orderQueryInterface.addIndex('orders', ['deliveryResponseDeadline']);
    }
    if (!orderColumns.deliveryResolution) {
      await orderQueryInterface.addColumn('orders', 'deliveryResolution', { type: Sequelize.STRING(32), allowNull: true });
      await orderQueryInterface.addIndex('orders', ['deliveryResolution']);
    }
  }

  const paymentQueryInterface = paymentsDB.getQueryInterface();
  const paymentTables = await paymentQueryInterface.showAllTables();
  const paymentTableNames = paymentTables.map((table) => (
    typeof table === 'string' ? table : table.tableName || table.name
  ));

  if (paymentTableNames.includes('payments')) {
    const paymentColumns = await paymentQueryInterface.describeTable('payments');
    if (!paymentColumns.stripeChargeId) {
      await paymentQueryInterface.addColumn('payments', 'stripeChargeId', {
        type: Sequelize.STRING(80),
        allowNull: true
      });
    }
    if (!paymentColumns.fundsStatus) {
      await paymentQueryInterface.addColumn('payments', 'fundsStatus', {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: 'NotFunded'
      });
    }
  }

  if (!paymentTableNames.includes('seller_payouts')) {
    await paymentQueryInterface.createTable('seller_payouts', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
      orderId: { type: Sequelize.UUID, allowNull: false },
      paymentId: { type: Sequelize.UUID, allowNull: false },
      sellerId: { type: Sequelize.UUID, allowNull: false },
      stripeConnectedAccountId: { type: Sequelize.STRING(80), allowNull: true },
      stripeTransferId: { type: Sequelize.STRING(80), allowNull: true, unique: true },
      payoutMethodId: { type: Sequelize.UUID, allowNull: true },
      payoutProvider: { type: Sequelize.STRING(32), allowNull: true },
      payoutDestination: { type: Sequelize.STRING(80), allowNull: true },
      processor: { type: Sequelize.STRING(32), allowNull: true },
      processorReference: { type: Sequelize.STRING(100), allowNull: true, unique: true },
      releaseReason: { type: Sequelize.STRING(32), allowNull: true },
      currency: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'pkr' },
      grossAmount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      commissionRate: { type: Sequelize.DECIMAL(7, 6), allowNull: false, defaultValue: 0.01 },
      commissionAmount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      netAmount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      status: { type: Sequelize.STRING(24), allowNull: false, defaultValue: 'Pending' },
      failureMessage: { type: Sequelize.TEXT, allowNull: true },
      releaseAttemptedAt: { type: Sequelize.DATE, allowNull: true },
      releasedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    await paymentQueryInterface.addIndex('seller_payouts', ['orderId', 'sellerId'], { unique: true });
    await paymentQueryInterface.addIndex('seller_payouts', ['sellerId']);
    await paymentQueryInterface.addIndex('seller_payouts', ['status']);
  } else {
    const payoutColumns = await paymentQueryInterface.describeTable('seller_payouts');
    await paymentQueryInterface.changeColumn('seller_payouts', 'stripeConnectedAccountId', {
      type: Sequelize.STRING(80),
      allowNull: true,
    });
    await paymentQueryInterface.changeColumn('seller_payouts', 'commissionRate', {
      type: Sequelize.DECIMAL(7, 6),
      allowNull: false,
      defaultValue: 0.01,
    });
    const payoutColumnDefinitions = {
      payoutMethodId: { type: Sequelize.UUID, allowNull: true },
      payoutProvider: { type: Sequelize.STRING(32), allowNull: true },
      payoutDestination: { type: Sequelize.STRING(80), allowNull: true },
      processor: { type: Sequelize.STRING(32), allowNull: true },
      processorReference: { type: Sequelize.STRING(100), allowNull: true, unique: true },
      releaseReason: { type: Sequelize.STRING(32), allowNull: true },
    };
    for (const [column, definition] of Object.entries(payoutColumnDefinitions)) {
      if (!payoutColumns[column]) await paymentQueryInterface.addColumn('seller_payouts', column, definition);
    }
  }

  if (!paymentTableNames.includes('seller_payment_methods')) {
    await paymentQueryInterface.createTable('seller_payment_methods', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
      sellerId: { type: Sequelize.UUID, allowNull: false },
      provider: { type: Sequelize.STRING(32), allowNull: false },
      accountTitle: { type: Sequelize.STRING(120), allowNull: false },
      accountIdentifierEncrypted: { type: Sequelize.TEXT, allowNull: false },
      accountIdentifierLast4: { type: Sequelize.STRING(4), allowNull: false },
      isDefault: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await paymentQueryInterface.addIndex('seller_payment_methods', ['sellerId']);
    await paymentQueryInterface.addIndex('seller_payment_methods', ['sellerId', 'isDefault']);
    await paymentQueryInterface.addIndex('seller_payment_methods', ['sellerId', 'active']);
  }
}

async function initializeDatabases() {
  const uniqueEntries = [];
  const seen = new Set();
  for (const [label, database] of Object.entries(databases)) {
    if (seen.has(database)) continue;
    seen.add(database);
    uniqueEntries.push([label, database]);
  }
  const unique = uniqueEntries.map(([, database]) => database);
  await Promise.all(uniqueEntries.map(([label, database]) => authenticateWithRetry(label, database)));

  // Existing databases need these additive columns before Sequelize evaluates
  // model indexes during sync. Fresh databases have no orders table yet and
  // will receive the columns from the Order/OrderItem models during sync.
  await ensureCheckoutTokenSchema();
  await ensureOrderFulfillmentSchema();
  await ensureProductCategorySchema();

  if (String(process.env.AUTO_SYNC || 'true').toLowerCase() === 'true') {
    const alter = String(process.env.DB_SYNC_ALTER || 'false').toLowerCase() === 'true';
    await Promise.all(unique.map((db) => db.sync({ alter })));
  }

  await applySafeMigrations();
}

module.exports = { ...databases, initializeDatabases, ensureCheckoutTokenSchema, ensureBidProductSchema, ensureOrderFulfillmentSchema, ensureProductCategorySchema };
