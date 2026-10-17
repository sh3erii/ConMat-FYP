const { DataTypes } = require('sequelize');
const { paymentsDB } = require('../config/database');
module.exports = paymentsDB.define('Notification', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING(160), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  type: { type: DataTypes.ENUM('System','Order','Payment','Invoice','Bid','Verification','Account','Report'), allowNull: false, defaultValue: 'System' },
  isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  readAt: { type: DataTypes.DATE, allowNull: true },
  actionUrl: { type: DataTypes.STRING, allowNull: true },
  metadata: { type: DataTypes.JSONB, allowNull: true }
}, { tableName: 'notifications', timestamps: true, indexes: [{ fields: ['userId'] },{ fields: ['isRead'] }] });
