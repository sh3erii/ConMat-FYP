const { DataTypes } = require('sequelize');
const orderDb = require('../config/db.orders');

const SupplierSalesMetric = orderDb.define('SupplierSalesMetric', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  supplierId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  periodLabel: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  periodStart: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  periodEnd: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  totalRevenue: {
    type: DataTypes.DECIMAL(14, 2),
    defaultValue: 0,
  },
  totalOrders: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  fulfilledOrders: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  cancelledOrders: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  averageOrderValue: {
    type: DataTypes.DECIMAL(14, 2),
    defaultValue: 0,
  },
  repeatBuyers: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  tableName: 'supplier_sales_metrics',
  timestamps: true,
});

module.exports = SupplierSalesMetric;
