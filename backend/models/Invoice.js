// ============================================================
//  models/Invoice.js  (Muhammad Nosherwan – 076926)
//  Day 2 – Invoice model stored in payments_db
// ============================================================
const { DataTypes } = require('sequelize');
const paymentsDB = require('../config/db.payments');

const Invoice = paymentsDB.define('Invoice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  invoiceNumber: {
    type: DataTypes.STRING(40),
    allowNull: false,
    unique: true
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Cross-database reference to orders_db.orders.id'
  },
  paymentId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Reference to payments_db.payments.id'
  },
  buyerId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Cross-database reference to users_db.users.id'
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  taxAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  totalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'pkr'
  },
  pdfUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Generated', 'Sent', 'Cancelled'),
    allowNull: false,
    defaultValue: 'Generated'
  },
  issuedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'invoices',
  timestamps: true
});

paymentsDB.sync({ alter: true })
  .then(() => console.log('📋 invoices table synced.'))
  .catch((err) => console.error('❌ invoices table sync failed:', err.message));

module.exports = Invoice;
