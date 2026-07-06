const { DataTypes } = require('sequelize');
const productsDB = require('../config/db.products');

const PricingSlab = productsDB.define('PricingSlab', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Cross-database-safe reference to products_db.products.id'
  },
  label: {
    type: DataTypes.STRING(80),
    allowNull: false,
    defaultValue: 'Wholesale slab'
  },
  minQty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 }
  },
  maxQty: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1 }
  },
  unitPrice: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: { min: 0 }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'pricing_slabs',
  timestamps: true,
  indexes: [
    { fields: ['productId'] },
    { fields: ['minQty'] },
    { fields: ['isActive'] }
  ]
});

productsDB.sync({ alter: true })
  .then(() => console.log('📋 pricing_slabs table synced.'))
  .catch((err) => console.error('❌ pricing_slabs table sync failed:', err.message));

module.exports = PricingSlab;
