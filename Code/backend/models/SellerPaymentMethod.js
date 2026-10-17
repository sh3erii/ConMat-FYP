const { DataTypes } = require('sequelize');
const { paymentsDB } = require('../config/database');

module.exports = paymentsDB.define('SellerPaymentMethod', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  sellerId: { type: DataTypes.UUID, allowNull: false },
  provider: {
    type: DataTypes.STRING(32),
    allowNull: false,
    validate: { isIn: [['JazzCash', 'Easypaisa', 'NayaPay', 'UBL', 'Meezan Bank']] },
  },
  accountTitle: { type: DataTypes.STRING(120), allowNull: false },
  accountIdentifierEncrypted: { type: DataTypes.TEXT, allowNull: false },
  accountIdentifierLast4: { type: DataTypes.STRING(4), allowNull: false },
  isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  tableName: 'seller_payment_methods',
  timestamps: true,
  indexes: [
    { fields: ['sellerId'] },
    { fields: ['sellerId', 'isDefault'] },
    { fields: ['sellerId', 'active'] },
  ],
});
