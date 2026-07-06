const { DataTypes } = require('sequelize');
const ordersDb = require('../config/db.orders');

const OrderPaymentStatusLog = ordersDb.define('OrderPaymentStatusLog', {
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
    defaultValue: 'Unpaid',
  },
  paymentReference: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  changedBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'order_payment_status_logs',
  timestamps: true,
});

module.exports = OrderPaymentStatusLog;
