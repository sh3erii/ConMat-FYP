const { DataTypes } = require('sequelize');
const productsDB = require('../config/db.products');

const Product = productsDB.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  sellerId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Cross-database reference to users_db.users.id'
  },
  name: {
    type: DataTypes.STRING(160),
    allowNull: false,
    validate: { notEmpty: true }
  },
  category: {
    type: DataTypes.ENUM('Cement', 'Steel', 'Bricks', 'Sand', 'Crush', 'Tiles', 'Paint', 'Electrical', 'Plumbing', 'Other'),
    allowNull: false,
    defaultValue: 'Other'
  },
  brand: {
    type: DataTypes.STRING(120),
    allowNull: true
  },
  unit: {
    type: DataTypes.ENUM('bag', 'kg', 'ton', 'piece', 'bundle', 'cft', 'sqft', 'liter'),
    allowNull: false,
    defaultValue: 'piece'
  },
  retailPrice: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: { min: 0 }
  },
  wholesalePrice: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: { min: 0 }
  },
  minWholesaleQty: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 50,
    validate: { min: 1 }
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 }
  },
  city: {
    type: DataTypes.STRING(80),
    allowNull: false,
    defaultValue: 'Gujranwala'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Draft', 'Pending', 'Active', 'OutOfStock', 'Rejected'),
    allowNull: false,
    defaultValue: 'Active'
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'products',
  timestamps: true,
  indexes: [
    { fields: ['category'] },
    { fields: ['city'] },
    { fields: ['sellerId'] },
    { fields: ['status'] }
  ]
});

productsDB.sync({ alter: true })
  .then(() => console.log('📋 products table synced.'))
  .catch((err) => console.error('❌ products table sync failed:', err.message));

module.exports = Product;
