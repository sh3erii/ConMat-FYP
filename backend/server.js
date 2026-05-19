// ============================================================
//  server.js – ConMat Backend Entry Point
// ============================================================
const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');

const app = express();

// ── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://your-production-domain.com'
    : 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'ConMat API is running ✅', version: '1.0.0' });
});

// ── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Global Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// ── Start Server ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 ConMat server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
});
