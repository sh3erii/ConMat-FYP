const { DataTypes } = require('sequelize');
const { bidsDB } = require('../config/database');
const Bid = bidsDB.define('Bid', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  requestedById: { type: DataTypes.UUID, allowNull: false },
  requesterRole: { type: DataTypes.ENUM('Customer','Retailer','Wholesaler'), allowNull: false },
  productId: { type: DataTypes.UUID, allowNull: true },
  title: { type: DataTypes.STRING(180), allowNull: false, defaultValue: 'Bulk Material Request' },
  category: { type: DataTypes.STRING(80), allowNull: true },
  city: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'Gujranwala' },
  requiredQuantity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
  unit: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'piece' },
  targetPrice: { type: DataTypes.DECIMAL(12,2), allowNull: true },
  deliveryAddress: { type: DataTypes.TEXT, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  requestStatus: { type: DataTypes.ENUM('Open','Closed','Cancelled','Expired'), allowNull: false, defaultValue: 'Open' },
  acceptedOfferId: { type: DataTypes.UUID, allowNull: true },
  expiresAt: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'bid_requests', timestamps: true, indexes: [{ fields: ['requestedById'] },{ fields: ['requestStatus'] },{ fields: ['city'] }] });
const BidOffer = bidsDB.define('BidOffer', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  bidRequestId: { type: DataTypes.UUID, allowNull: false },
  supplierId: { type: DataTypes.UUID, allowNull: false },
  productId: { type: DataTypes.UUID, allowNull: true },
  bidAmount: { type: DataTypes.DECIMAL(12,2), allowNull: false, validate: { min: 0 } },
  deliveryDays: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3, validate: { min: 1 } },
  notes: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('Submitted','Accepted','Rejected','Cancelled'), allowNull: false, defaultValue: 'Submitted' }
}, { tableName: 'bid_offers', timestamps: true, indexes: [{ fields: ['bidRequestId'] },{ fields: ['supplierId'] },{ fields: ['productId'] },{ fields: ['status'] }] });
Bid.hasMany(BidOffer, { foreignKey: 'bidRequestId', as: 'offers' });
BidOffer.belongsTo(Bid, { foreignKey: 'bidRequestId', as: 'request' });
module.exports = { Bid, BidOffer };
