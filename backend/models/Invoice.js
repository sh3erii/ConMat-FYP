const { DataTypes } = require('sequelize');
const { paymentsDB } = require('../config/database');
module.exports = paymentsDB.define('Invoice', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  invoiceNumber: { type: DataTypes.STRING(80), allowNull: false, unique: true },
  orderId: { type: DataTypes.UUID, allowNull: false, unique: true },
  buyerId: { type: DataTypes.UUID, allowNull: false },
  paymentId: { type: DataTypes.UUID, allowNull: true },
  subtotal: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
  deliveryFee: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
  tax: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
  discount: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
  status: { type: DataTypes.ENUM('Issued','Paid','Cancelled'), allowNull: false, defaultValue: 'Paid' },
  issuedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  paidAt: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'invoices', timestamps: true, indexes: [{ fields: ['invoiceNumber'] },{ fields: ['buyerId'] }] });
