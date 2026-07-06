const { DataTypes } = require('sequelize');
const productsDb = require('../config/db.products');

const InventoryForecast = productsDb.define('InventoryForecast', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
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
  averageDailySales: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  forecastedDemand: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  daysUntilStockout: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  periodDays: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30,
  },
  confidence: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.75,
  },
  recommendation: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'inventory_forecasts',
  timestamps: true,
});

module.exports = InventoryForecast;
