const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
require('./models');
const { initializeDatabases } = require('./config/database');
const paymentController = require('./controllers/paymentController');
const errorHandler = require('./middleware/errorHandler');
const { startAutoReleaseWorker } = require('./services/autoReleaseService');
const { initializeSocket } = require('./services/socketService');

const app = express();
const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'].filter(Boolean);
app.use(cors({ origin(origin, cb) { if (!origin || allowedOrigins.includes(origin)) return cb(null, true); cb(new Error('Not allowed by CORS')); }, credentials: true }));

// Stripe signature verification needs the original raw request body.
app.post('/api/stripe-payments/webhook', express.raw({ type: 'application/json' }), paymentController.webhook);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => res.json({ success: true }));
app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/checkout', require('./routes/checkoutRoutes'));
app.use('/api/order-tracking', require('./routes/orderTrackingRoutes'));
app.use('/api/stripe-payments', require('./routes/paymentRoutes'));
app.use('/api/payout-methods', require('./routes/payoutMethodRoutes'));
app.use('/api/invoices', require('./routes/invoiceRoutes'));
app.use('/api/pricing', require('./routes/pricingRoutes'));
app.use('/api/bids', require('./routes/bidRoutes'));
app.use('/api/bid-conversion', require('./routes/bidConversionRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/notification-preferences', require('./routes/notificationPreferenceRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/inventory/analytics', require('./routes/inventoryAnalyticsRoutes'));
app.use('/api/supplier/analytics', require('./routes/supplierAnalyticsRoutes'));

app.use((req, res) => res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` }));
app.use(errorHandler);

async function start() {
  const skipDatabaseInitialization = String(process.env.SKIP_DB_INIT || 'false').toLowerCase() === 'true';
  if (!skipDatabaseInitialization) {
    await initializeDatabases();
    console.log('Database connections ready.');
  }
  if (!skipDatabaseInitialization && String(process.env.ENABLE_AUTO_RELEASE_WORKER || 'true').toLowerCase() === 'true') {
    startAutoReleaseWorker();
  }
  const port = Number(process.env.PORT || 5000);
  const server = http.createServer(app);
  initializeSocket(server, allowedOrigins);
  return server.listen(port, () => console.log(`ConMat API listening on http://localhost:${port}`));
}

if (require.main === module) {
  start().catch((error) => { console.error('Startup failed:', error.message); process.exit(1); });
}
module.exports = { app, start };
