const { DataTypes } = require('sequelize');
const { usersDB } = require('../config/database');

module.exports = usersDB.define('PasswordResetOtp', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  email: { type: DataTypes.STRING(180), allowNull: false, unique: true, validate: { isEmail: true } },
  otpHash: { type: DataTypes.STRING, allowNull: false },
  otpExpiresAt: { type: DataTypes.DATE, allowNull: false },
  resendAvailableAt: { type: DataTypes.DATE, allowNull: false },
  attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, {
  tableName: 'password_reset_otps',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['email'] },
    { fields: ['otpExpiresAt'] },
  ],
});
