const { DataTypes } = require('sequelize');
const productsDB = require('../config/db.products');
const Product = require('./Product');

const StockMovement = productsDB.define('StockMovement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  sellerId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Cross-database reference to users_db.users.id'
  },
  previousStock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  newStock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  changeQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  movementType: {
    type: DataTypes.ENUM('ManualUpdate', 'BulkUpdate', 'OrderDeduction', 'Restock', 'Correction'),
    allowNull: false,
    defaultValue: 'ManualUpdate'
  },
  reason: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  referenceType: {
    type: DataTypes.STRING(60),
    allowNull: true
  },
  referenceId: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'stock_movements',
  timestamps: true,
  indexes: [
    { fields: ['productId'] },
    { fields: ['sellerId'] },
    { fields: ['movementType'] }
  ]
});

Product.hasMany(StockMovement, { foreignKey: 'productId', as: 'stockMovements' });
StockMovement.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

productsDB.sync({ alter: true })
  .then(() => console.log('📋 stock_movements table synced.'))
  .catch((err) => console.error('❌ stock_movements table sync failed:', err.message));

module.exports = StockMovement;
