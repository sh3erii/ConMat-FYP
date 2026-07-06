const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// ── Database Connections ─────────────────────────────────────
// Import DB configs to establish Sequelize connections
require('./config/db.users');
require('./config/db.products');

// ── Route Imports ───────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const bidRoutes = require('./routes/bidRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const supplierInventoryRoutes = require('./routes/supplierInventoryRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const pricingRoutes = require('./routes/pricingRoutes');
const bidConversionRoutes = require('./routes/bidConversionRoutes');
const userProfileRoutes = require('./routes/userProfileRoutes');
const adminVerificationRoutes = require('./routes/adminVerificationRoutes');
const orderTrackingRoutes = require('./routes/orderTrackingRoutes');
const notificationPreferenceRoutes = require('./routes/notificationPreferenceRoutes');
const orderPaymentStatusRoutes = require('./routes/orderPaymentStatusRoutes');
const stripePaymentRoutes = require('./routes/stripePaymentRoutes');
const adminProductManagementRoutes = require('./routes/adminProductManagementRoutes');
const adminOrderManagementRoutes = require('./routes/adminOrderManagementRoutes');
const adminOperationsRoutes = require('./routes/adminOperationsRoutes');
const inventoryAnalyticsRoutes = require('./routes/inventoryAnalyticsRoutes');
const adminAnalyticsReportRoutes = require('./routes/adminAnalyticsReportRoutes');
const supplierAnalyticsRoutes = require('./routes/supplierAnalyticsRoutes');
const reportScheduleRoutes = require('./routes/reportScheduleRoutes');
const notificationAutomationRoutes = require('./routes/notificationAutomationRoutes');
const integrationHealthRoutes = require('./routes/integrationHealthRoutes');
const notFoundHandler = require('./middleware/notFoundHandler');
const apiErrorHandler = require('./middleware/apiErrorHandler');
const integrationAuditRoutes = require('./routes/integrationAuditRoutes');
const finalApiCheckRoutes = require('./routes/finalApiCheckRoutes');
const requestLogger = require('./middleware/requestLogger');
const finalAdminQaRoutes = require('./routes/finalAdminQaRoutes');
const finalBackendReadinessRoutes = require('./routes/finalBackendReadinessRoutes');
const finalDemoRoutes = require('./routes/finalDemoRoutes');

const app = express();

// ── Middleware ───────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Serve static files from uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/seller/inventory', supplierInventoryRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/bid-conversion', bidConversionRoutes);
app.use('/api/users', userProfileRoutes);
app.use('/api/admin', adminVerificationRoutes);
app.use('/api/order-tracking', orderTrackingRoutes);
app.use('/api/notification-preferences', notificationPreferenceRoutes);
app.use('/api/order-payment-status', orderPaymentStatusRoutes);
app.use('/api/stripe-payments', stripePaymentRoutes);
app.use('/api/admin/product-management', adminProductManagementRoutes);
app.use('/api/admin/order-management', adminOrderManagementRoutes);
app.use('/api/admin/operations', adminOperationsRoutes);
app.use('/api/inventory/analytics', inventoryAnalyticsRoutes);
app.use('/api/admin/analytics', adminAnalyticsReportRoutes);
app.use('/api/supplier/analytics', supplierAnalyticsRoutes);
app.use('/api/admin/report-schedules', reportScheduleRoutes);
app.use('/api/admin/notification-automation', notificationAutomationRoutes);
app.use('/api/integration/health', integrationHealthRoutes);
app.use('/api/admin/integration-audit', integrationAuditRoutes);
app.use('/api/final-check', finalApiCheckRoutes);
app.use('/api/admin/final-qa', finalAdminQaRoutes);
app.use('/api/final-readiness', finalBackendReadinessRoutes);
app.use('/api/final-demo', finalDemoRoutes);

app.use(notFoundHandler);
app.use(apiErrorHandler);

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'ConMat API is running ✅',
    version: '1.0.0-day2-merged',
    modules: ['auth', 'products']
  });
});



// ── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Global Error:', err.message);

  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, message: err.message });
  }

  return res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// ── Start Server ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 ConMat server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('   Active routes: /api/auth, /api/products\n');
});
