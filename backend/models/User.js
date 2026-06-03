const { DataTypes } = require('sequelize');
const usersDB = require('../config/db.users');

const User = usersDB.define('User', {
  id: {
    type:          DataTypes.UUID,
    defaultValue:  DataTypes.UUIDV4,
    primaryKey:    true
  },
  name: {
    type:      DataTypes.STRING,
    allowNull: false,
    validate:  { notEmpty: true }
  },
  email: {
    type:      DataTypes.STRING,
    allowNull: false,
    unique:    true,
    validate:  { isEmail: true }
  },
  phone: {
    type:      DataTypes.STRING,
    allowNull: true
  },
  passwordHash: {
    type:      DataTypes.STRING,
    allowNull: false
  },
  // Role: Admin | Supplier | Wholesaler | Retailer | Customer
  role: {
    type:         DataTypes.ENUM('Admin', 'Supplier', 'Wholesaler', 'Retailer', 'Customer'),
    allowNull:    false,
    defaultValue: 'Customer'
  },
  // Suppliers are Pending until Admin approves; others are Active immediately
  status: {
    type:         DataTypes.ENUM('Active', 'Pending', 'Rejected'),
    allowNull:    false,
    defaultValue: 'Active'
  },
  // Business info – only filled by Supplier/Wholesaler/Retailer
  companyName: {
    type:         DataTypes.STRING,
    allowNull:    true
  },
  businessApprovalLetter: {
    type:         DataTypes.STRING,   // file path stored by Multer
    allowNull:    true
  }
}, {
  tableName:  'users',
  timestamps: true    // createdAt, updatedAt auto-added
});

// Sync table to database (creates if not exists, does NOT drop existing)
usersDB.sync({ alter: true })
  .then(() => console.log('📋 users table synced.'))
  .catch(err => console.error('❌ users table sync failed:', err.message));

module.exports = User;
