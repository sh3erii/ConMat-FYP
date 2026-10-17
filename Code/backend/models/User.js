const { DataTypes } = require('sequelize');
const { usersDB } = require('../config/database');

const User = usersDB.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  email: { type: DataTypes.STRING(180), allowNull: false, unique: true, validate: { isEmail: true } },
  phone: { type: DataTypes.STRING(40), allowNull: true, unique: true },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('Admin', 'Supplier', 'Wholesaler', 'Retailer', 'Customer'), allowNull: false, defaultValue: 'Customer' },
  status: { type: DataTypes.ENUM('Active', 'Pending', 'Rejected'), allowNull: false, defaultValue: 'Active' },
  verificationStatus: { type: DataTypes.ENUM('NotRequired', 'Pending', 'Approved', 'Rejected'), allowNull: false, defaultValue: 'NotRequired' },
  companyName: { type: DataTypes.STRING(160), allowNull: true },
  cnic: { type: DataTypes.STRING(30), allowNull: true, unique: true },
  street: { type: DataTypes.STRING(220), allowNull: true },
  city: { type: DataTypes.STRING(100), allowNull: true },
  postalCode: { type: DataTypes.STRING(24), allowNull: true },
  latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
  longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
  profilePhoto: { type: DataTypes.STRING, allowNull: true },
  userPhoto: { type: DataTypes.STRING, allowNull: true },
  idCardPhoto: { type: DataTypes.STRING, allowNull: true },
  ntnPhoto: { type: DataTypes.STRING, allowNull: true },
  businessApprovalLetter: { type: DataTypes.STRING, allowNull: true },
  verificationNote: { type: DataTypes.TEXT, allowNull: true },
  materialFocus: { type: DataTypes.STRING(160), allowNull: true },
  stripeConnectedAccountId: { type: DataTypes.STRING(80), allowNull: true, unique: true },
  stripeDetailsSubmitted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  stripePayoutsEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  stripeTransfersStatus: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'inactive' },
  stripePayoutCountry: { type: DataTypes.STRING(2), allowNull: true }
}, { tableName: 'users', timestamps: true, indexes: [{ fields: ['role'] }, { fields: ['status'] }, { fields: ['verificationStatus'] }] });

module.exports = User;
