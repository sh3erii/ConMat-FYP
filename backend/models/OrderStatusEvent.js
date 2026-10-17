const { DataTypes } = require('sequelize');
const { ordersDB } = require('../config/database');
module.exports = ordersDB.define('OrderStatusEvent', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orderId: { type: DataTypes.UUID, allowNull: false },
  orderItemId: { type: DataTypes.UUID, allowNull: true },
  sellerId: { type: DataTypes.UUID, allowNull: true },
  status: { type: DataTypes.STRING(80), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  location: { type: DataTypes.STRING(120), allowNull: true },
  updatedBy: { type: DataTypes.UUID, allowNull: true },
  visibleToBuyer: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, { tableName: 'order_status_events', timestamps: true, indexes: [{ fields: ['orderId'] }, { fields: ['orderItemId'] }, { fields: ['sellerId'] }] });
