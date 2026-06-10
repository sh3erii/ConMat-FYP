const { DataTypes } = require('sequelize');
const usersDb = require('../config/db.users');

const NotificationPreference = usersDb.define(
  'NotificationPreference',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    orderUpdates: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    bidUpdates: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    paymentInvoices: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    adminAlerts: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    emailEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: 'notification_preferences',
    timestamps: true,
  }
);

module.exports = NotificationPreference;
