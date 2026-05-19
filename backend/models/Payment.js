// ============================================================
//  models/Payment.js  (Muhammad Nosherwan – 076926)
//  Payment model – stored in payments_db
// ============================================================
const { DataTypes } = require('sequelize');
const paymentsDB = require('../config/db.payments');

const Payment = paymentsDB.define('Payment', {
  id: {
    type:         DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey:   true
  },
  // Cross-db reference to orders_db
  orderId: {
    type:      DataTypes.UUID,
    allowNull: false
  },
  // Cross-db reference to users_db
  buyerId: {
    type:      DataTypes.UUID,
    allowNull: false
  },
  amount: {
    type:      DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  currency: {
    type:         DataTypes.STRING(10),
    allowNull:    false,
    defaultValue: 'pkr'
  },
  method: {
    type:         DataTypes.ENUM('card', 'bank_transfer'),
    allowNull:    false,
    defaultValue: 'card'
  },
  status: {
    type:         DataTypes.ENUM('pending', 'success', 'failed'),
    allowNull:    false,
    defaultValue: 'pending'
  },
  // Stripe PaymentIntent ID returned after charge
  stripePaymentIntentId: {
    type:      DataTypes.STRING,
    allowNull: true
  },
  // Stripe transaction ID (charge ID)
  transactionId: {
    type:      DataTypes.STRING,
    allowNull: true
  },
  // URL of generated PDF invoice stored on server
  invoicePdfUrl: {
    type:      DataTypes.STRING,
    allowNull: true
  },
  paidAt: {
    type:      DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName:  'payments',
  timestamps: true
});

paymentsDB.sync({ alter: true })
  .then(() => console.log('📋 payments table synced.'))
  .catch(err => console.error('❌ payments table sync failed:', err.message));

module.exports = Payment;
