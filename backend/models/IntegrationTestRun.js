const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.orders');

const IntegrationTestRun = sequelize.define('IntegrationTestRun', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  runCode: { type: DataTypes.STRING, allowNull: false, unique: true },
  totalChecks: { type: DataTypes.INTEGER, defaultValue: 0 },
  passedChecks: { type: DataTypes.INTEGER, defaultValue: 0 },
  failedChecks: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.ENUM('passed', 'failed', 'partial'), defaultValue: 'partial' },
  startedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  completedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'integration_test_runs',
  timestamps: true,
});

module.exports = IntegrationTestRun;
