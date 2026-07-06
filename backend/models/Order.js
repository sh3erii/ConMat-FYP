const { DataTypes } = require('sequelize');
const ordersDB = require('../config/db.orders');

const Order = ordersDB.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  orderNumber: {
    type: DataTypes.STRING(40),
    allowNull: false,
    unique: true
  },
  buyerId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Cross-database reference to users_db.users.id'
  },
  buyerRole: {
    type: DataTypes.ENUM('Customer', 'Retailer', 'Wholesaler', 'Supplier', 'Admin'),
    allowNull: false
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  shippingFee: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  taxAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  totalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Paid', 'Cancelled'),
    allowNull: false,
    defaultValue: 'Pending',
    comment: 'Kept for compatibility with Day 2 paymentController.js'
  },
  orderStatus: {
    type: DataTypes.ENUM('Placed', 'Confirmed', 'Processing', 'Dispatched', 'Delivered', 'Cancelled'),
    allowNull: false,
    defaultValue: 'Placed'
  },
  paymentStatus: {
    type: DataTypes.ENUM('Pending', 'Paid', 'Failed', 'Refunded'),
    allowNull: false,
    defaultValue: 'Pending'
  },
  paymentId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Cross-database reference to payments_db.payments.id'
  },
  shippingAddress: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  contactPhone: {
    type: DataTypes.STRING(30),
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'orders',
  timestamps: true,
  indexes: [
    { fields: ['buyerId'] },
    { fields: ['orderStatus'] },
    { fields: ['paymentStatus'] },
    { fields: ['orderNumber'] }
  ]
});

ordersDB.sync({ alter: true })
  .then(() => console.log('📋 orders table synced.'))
  .catch((err) => console.error('❌ orders table sync failed:', err.message));

module.exports = Order;
