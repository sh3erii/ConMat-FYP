const { DataTypes } = require('sequelize');
const usersDb = require('../config/db.users');

const AdminReportChart = usersDb.define('AdminReportChart', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  moduleName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  chartType: {
    type: DataTypes.ENUM('bar', 'line', 'pie', 'stat', 'table'),
    allowNull: false,
    defaultValue: 'bar',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  config: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'admin_report_charts',
  timestamps: true,
});

module.exports = AdminReportChart;
