// ============================================================
//  models/Invoice.js
//  Owner: Muhammad Nosherwan (076926)
//  Day 5 – invoice records stored in payments_db
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
    type: DataTypes.STRING(80),
    allowNull: false,
    unique: true
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  buyerId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  paymentId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  deliveryFee: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  tax: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  total: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('Draft', 'Issued', 'Paid', 'Cancelled'),
    allowNull: false,
    defaultValue: 'Issued'
  },
  issuedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'invoices',
  timestamps: true,
  indexes: [
    { fields: ['invoiceNumber'] },
    { fields: ['orderId'] },
    { fields: ['buyerId'] }
  ]
});

paymentsDB.sync({ alter: true })
  .then(() => console.log('🧾 invoices table synced.'))
  .catch((err) => console.error('❌ invoices table sync failed:', err.message));

module.exports = Invoice;
