const { DataTypes } = require('sequelize');
const ordersDb = require('../config/db.orders');

const OrderTrackingEvent = ordersDb.define(
  'OrderTrackingEvent',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    orderNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('PLACED', 'PAID', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'RETURNED'),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    visibleToBuyer: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: 'order_tracking_events',
    timestamps: true,
  }
);

module.exports = OrderTrackingEvent;
