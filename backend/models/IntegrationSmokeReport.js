const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.payments');

const IntegrationSmokeReport = sequelize.define('IntegrationSmokeReport', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  reportCode: { type: DataTypes.STRING, allowNull: false, unique: true },
  totalChecks: { type: DataTypes.INTEGER, defaultValue: 0 },
  passedChecks: { type: DataTypes.INTEGER, defaultValue: 0 },
  failedChecks: { type: DataTypes.INTEGER, defaultValue: 0 },
  warningChecks: { type: DataTypes.INTEGER, defaultValue: 0 },
  summary: { type: DataTypes.TEXT, allowNull: true },
  generatedBy: { type: DataTypes.STRING, defaultValue: 'admin' },
}, {
  tableName: 'integration_smoke_reports',
  timestamps: true,
});

module.exports = IntegrationSmokeReport;
