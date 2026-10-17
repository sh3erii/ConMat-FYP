const { DataTypes } = require('sequelize');
const { usersDB } = require('../config/database');
module.exports = usersDB.define('NotificationPreference', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false, unique: true },
  orderUpdates: { type: DataTypes.BOOLEAN, defaultValue: true },
  bidUpdates: { type: DataTypes.BOOLEAN, defaultValue: true },
  paymentInvoices: { type: DataTypes.BOOLEAN, defaultValue: true },
  adminAlerts: { type: DataTypes.BOOLEAN, defaultValue: true },
  emailEnabled: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'notification_preferences', timestamps: true });
