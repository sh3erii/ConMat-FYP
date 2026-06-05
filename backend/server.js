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
const bidRoutes = require('./routes/bidRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');

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
app.use('/api/bids', bidRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/invoices', invoiceRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'ConMat API is running ✅',
    version: '1.0.0-day2-merged',
    modules: ['auth', 'products']
  });
});

// ── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
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
