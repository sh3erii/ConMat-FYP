const { DataTypes } = require('sequelize');
const ordersDb = require('../config/db.orders');

const OrderAdminStatusLog = ordersDb.define('OrderAdminStatusLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  orderNumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  previousStatus: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  newStatus: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  paymentStatus: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  adminId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'order_admin_status_logs',
  timestamps: true,
});

module.exports = OrderAdminStatusLog;
