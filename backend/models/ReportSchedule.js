const { DataTypes } = require('sequelize');
const reportDb = require('../config/db.payments');

const ReportSchedule = reportDb.define('ReportSchedule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  reportType: {
    type: DataTypes.ENUM('platform_summary', 'sales_report', 'inventory_report', 'bidding_report', 'seller_report'),
    allowNull: false,
  },
  frequency: {
    type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
    allowNull: false,
    defaultValue: 'weekly',
  },
  recipients: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  filters: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  lastRunAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  nextRunAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'report_schedules',
  timestamps: true,
});

module.exports = ReportSchedule;
