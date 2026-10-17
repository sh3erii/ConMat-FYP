const { DataTypes } = require('sequelize');
const { productsDB } = require('../config/database');
module.exports = productsDB.define('Product', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  sellerId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING(160), allowNull: false },
  category: { type: DataTypes.ENUM('Cement','Steel','Bricks','Sand','Crush','Tiles','Marble','Paint','Electrical','Plumbing','Other'), allowNull: false, defaultValue: 'Other' },
  brand: { type: DataTypes.STRING(120), allowNull: true },
  unit: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'piece' },
  retailPrice: { type: DataTypes.DECIMAL(12,2), allowNull: false, validate: { min: 0 } },
  wholesalePrice: { type: DataTypes.DECIMAL(12,2), allowNull: false, validate: { min: 0 } },
  minWholesaleQty: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 50, validate: { min: 1 } },
  withinCityDeliveryCharge: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0, validate: { min: 0 } },
  deliveryCharge: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0, validate: { min: 0 } },
  freeDeliveryMinQuantity: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 1 } },
  stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
  city: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'Gujranwala' },
  description: { type: DataTypes.TEXT, allowNull: true },
  imageUrl: { type: DataTypes.STRING, allowNull: true },
  status: { type: DataTypes.ENUM('Draft','Pending','Active','Hidden','OutOfStock','Rejected'), allowNull: false, defaultValue: 'Active' },
  verificationNote: { type: DataTypes.TEXT, allowNull: true },
  reviewRequestNote: { type: DataTypes.TEXT, allowNull: true },
  reviewRequestedAt: { type: DataTypes.DATE, allowNull: true },
  isFeatured: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, { tableName: 'products', timestamps: true, indexes: [{ fields: ['sellerId'] },{ fields: ['category'] },{ fields: ['city'] },{ fields: ['status'] }] });
