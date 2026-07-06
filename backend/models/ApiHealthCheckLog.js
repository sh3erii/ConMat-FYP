const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.orders');

const ApiHealthCheckLog = sequelize.define('ApiHealthCheckLog', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  moduleName: { type: DataTypes.STRING, allowNull: false },
  endpoint: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.ENUM('pass', 'fail', 'warning'), defaultValue: 'pass' },
  message: { type: DataTypes.TEXT, allowNull: true },
  responseTimeMs: { type: DataTypes.INTEGER, defaultValue: 0 },
  checkedBy: { type: DataTypes.STRING, defaultValue: 'system' },
}, {
  tableName: 'api_health_check_logs',
  timestamps: true,
});

module.exports = ApiHealthCheckLog;
