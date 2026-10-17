const { DataTypes } = require('sequelize');
const { paymentsDB } = require('../config/database');
module.exports = paymentsDB.define('Payment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orderId: { type: DataTypes.UUID, allowNull: false, unique: true },
  buyerId: { type: DataTypes.UUID, allowNull: false },
  amount: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'pkr' },
  method: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'card' },
  status: { type: DataTypes.ENUM('Pending','Paid','Failed','Refunded'), allowNull: false, defaultValue: 'Pending' },
  stripePaymentIntentId: { type: DataTypes.STRING, allowNull: true },
  stripeChargeId: { type: DataTypes.STRING, allowNull: true },
  transactionId: { type: DataTypes.STRING, allowNull: true },
  fundsStatus: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'NotFunded', validate: { isIn: [['NotFunded','Held','PartiallyReleased','Released','ReleaseFailed']] } },
  paidAt: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'payments', timestamps: true, indexes: [{ fields: ['buyerId'] },{ fields: ['status'] }] });
