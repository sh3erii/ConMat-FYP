// ============================================================
//  models/Notification.js  (Muhammad Nosherwan – 076926)
//  Day 3 – Notification model stored in payments_db service domain
// ============================================================
const { DataTypes } = require('sequelize');
const paymentsDB = require('../config/db.payments');

const Notification = paymentsDB.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Cross-database reference to users_db.users.id'
  },
  title: {
    type: DataTypes.STRING(160),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('System', 'Order', 'Payment', 'Bid', 'Verification', 'Report'),
    allowNull: false,
    defaultValue: 'System'
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true
  }
}, {
  tableName: 'notifications',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['type'] },
    { fields: ['isRead'] }
  ]
});

paymentsDB.sync({ alter: true })
  .then(() => console.log('📋 notifications table synced.'))
  .catch((err) => console.error('❌ notifications table sync failed:', err.message));

module.exports = Notification;
