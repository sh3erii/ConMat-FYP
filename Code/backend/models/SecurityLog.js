const { DataTypes } = require('sequelize');
const { usersDB } = require('../config/database');
module.exports = usersDB.define('SecurityLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  action: { type: DataTypes.STRING(120), allowNull: false },
  ip: { type: DataTypes.STRING(80), allowNull: true },
  device: { type: DataTypes.STRING(220), allowNull: true },
  location: { type: DataTypes.STRING(120), allowNull: true }
}, { tableName: 'security_logs', timestamps: true, indexes: [{ fields: ['userId'] }] });
