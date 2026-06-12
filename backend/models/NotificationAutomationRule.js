const { DataTypes } = require('sequelize');
const notificationDb = require('../config/db.bids');

const NotificationAutomationRule = notificationDb.define('NotificationAutomationRule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  triggerEvent: {
    type: DataTypes.ENUM('low_stock', 'order_paid', 'order_delayed', 'bid_received', 'seller_verified', 'payment_failed'),
    allowNull: false,
  },
  audienceRole: {
    type: DataTypes.ENUM('Admin', 'Supplier', 'Wholesaler', 'Retailer', 'Customer', 'All'),
    defaultValue: 'All',
  },
  channels: {
    type: DataTypes.JSONB,
    defaultValue: ['email'],
  },
  subjectTemplate: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  bodyTemplate: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  conditions: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  lastTriggeredAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'notification_automation_rules',
  timestamps: true,
});

module.exports = NotificationAutomationRule;
