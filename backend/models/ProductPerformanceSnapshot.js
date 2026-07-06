const { DataTypes } = require('sequelize');
const productDb = require('../config/db.products');

const ProductPerformanceSnapshot = productDb.define('ProductPerformanceSnapshot', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  supplierId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  productName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  orders: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  soldUnits: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  revenue: {
    type: DataTypes.DECIMAL(14, 2),
    defaultValue: 0,
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('Strong', 'Watch', 'Low Stock'),
    defaultValue: 'Watch',
  },
  snapshotDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'product_performance_snapshots',
  timestamps: true,
});

module.exports = ProductPerformanceSnapshot;
