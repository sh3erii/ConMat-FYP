const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.users');

const RoleAccessAudit = sequelize.define('RoleAccessAudit', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  role: { type: DataTypes.STRING, allowNull: false },
  routePath: { type: DataTypes.STRING, allowNull: false },
  moduleName: { type: DataTypes.STRING, allowNull: false },
  accessLevel: { type: DataTypes.ENUM('allowed', 'blocked', 'review'), defaultValue: 'review' },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'role_access_audits',
  timestamps: true,
});

module.exports = RoleAccessAudit;
