const { DataTypes } = require('sequelize');
const productsDb = require('../config/db.products');

const LowStockAlert = productsDb.define('LowStockAlert', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  sellerId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  productName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  sku: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  currentStock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  threshold: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 20,
  },
  severity: {
    type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
    allowNull: false,
    defaultValue: 'Medium',
  },
  status: {
    type: DataTypes.ENUM('Open', 'Resolved', 'Ignored'),
    allowNull: false,
    defaultValue: 'Open',
  },
  recommendedAction: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  resolvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'low_stock_alerts',
  timestamps: true,
});

module.exports = LowStockAlert;
