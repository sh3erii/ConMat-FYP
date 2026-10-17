const { DataTypes } = require('sequelize');
const { productsDB } = require('../config/database');

module.exports = productsDB.define('ProductReport', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  productId: { type: DataTypes.UUID, allowNull: false },
  reporterId: { type: DataTypes.UUID, allowNull: false },
  reason: { type: DataTypes.STRING(80), allowNull: false },
  details: { type: DataTypes.TEXT, allowNull: true },
  status: {
    type: DataTypes.STRING(24),
    allowNull: false,
    defaultValue: 'Pending',
    validate: { isIn: [['Pending', 'Reviewed', 'Resolved', 'Dismissed']] }
  },
  adminNote: { type: DataTypes.TEXT, allowNull: true },
  reviewedBy: { type: DataTypes.UUID, allowNull: true },
  reviewedAt: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'product_reports',
  timestamps: true,
  indexes: [
    { fields: ['productId'] },
    { fields: ['reporterId'] },
    { fields: ['status'] }
  ]
});
