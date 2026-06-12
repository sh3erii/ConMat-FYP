const { DataTypes } = require('sequelize');
const usersDb = require('../config/db.users');

const AdminAnalyticsSnapshot = usersDb.define('AdminAnalyticsSnapshot', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  snapshotDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  totalRevenue: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0,
  },
  totalOrders: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  activeUsers: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  verifiedSellers: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  pendingVerifications: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  conversionRate: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  averageOrderValue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  tableName: 'admin_analytics_snapshots',
  timestamps: true,
});

module.exports = AdminAnalyticsSnapshot;
