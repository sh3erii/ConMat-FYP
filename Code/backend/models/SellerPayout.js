const { DataTypes } = require('sequelize');
const { paymentsDB } = require('../config/database');

module.exports = paymentsDB.define('SellerPayout', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orderId: { type: DataTypes.UUID, allowNull: false },
  paymentId: { type: DataTypes.UUID, allowNull: false },
  sellerId: { type: DataTypes.UUID, allowNull: false },
  stripeConnectedAccountId: { type: DataTypes.STRING(80), allowNull: true },
  stripeTransferId: { type: DataTypes.STRING(80), allowNull: true, unique: true },
  payoutMethodId: { type: DataTypes.UUID, allowNull: true },
  payoutProvider: { type: DataTypes.STRING(32), allowNull: true },
  payoutDestination: { type: DataTypes.STRING(80), allowNull: true },
  processor: { type: DataTypes.STRING(32), allowNull: true },
  processorReference: { type: DataTypes.STRING(100), allowNull: true, unique: true },
  releaseReason: { type: DataTypes.STRING(32), allowNull: true },
  currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'pkr' },
  grossAmount: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  commissionRate: { type: DataTypes.DECIMAL(7,6), allowNull: false, defaultValue: 0.01 },
  commissionAmount: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  netAmount: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'Pending', validate: { isIn: [['Pending','Processing','Transferred','Failed','Reversed']] } },
  failureMessage: { type: DataTypes.TEXT, allowNull: true },
  releaseAttemptedAt: { type: DataTypes.DATE, allowNull: true },
  releasedAt: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'seller_payouts',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['orderId', 'sellerId'] },
    { fields: ['sellerId'] },
    { fields: ['status'] }
  ]
});
