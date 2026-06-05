const { DataTypes } = require('sequelize');
const ordersDB = require('../config/db.orders');

const OrderStatusHistory = ordersDB.define('OrderStatusHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Placed', 'Confirmed', 'Processing', 'Dispatched', 'Delivered', 'Cancelled'),
    allowNull: false,
    defaultValue: 'Placed'
  },
  title: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  changedBy: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'order_status_history',
  timestamps: true,
  indexes: [
    { fields: ['orderId'] },
    { fields: ['status'] }
  ]
});

ordersDB.sync({ alter: true })
  .then(() => console.log('📋 order_status_history table synced.'))
  .catch((err) => console.error('❌ order_status_history sync failed:', err.message));

module.exports = OrderStatusHistory;
