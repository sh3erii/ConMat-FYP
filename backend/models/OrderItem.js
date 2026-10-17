const { DataTypes } = require('sequelize');
const { ordersDB } = require('../config/database');
const Order = require('./Order');
const OrderItem = ordersDB.define('OrderItem', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  orderId: { type: DataTypes.UUID, allowNull: false },
  productId: { type: DataTypes.UUID, allowNull: true },
  sellerId: { type: DataTypes.UUID, allowNull: false },
  productName: { type: DataTypes.STRING(160), allowNull: false },
  category: { type: DataTypes.STRING(80), allowNull: true },
  unit: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'piece' },
  quantity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
  pricingType: { type: DataTypes.ENUM('retail','wholesale'), allowNull: false, defaultValue: 'retail' },
  unitPrice: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  lineTotal: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  fulfillmentStatus: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'Placed',
    validate: { isIn: [['Placed', 'Confirmed', 'Processing', 'Packed', 'Dispatched', 'Delivered', 'Payment Issue', 'Cancelled']] }
  },
  deliveryAddress: { type: DataTypes.TEXT, allowNull: true },
  deliveryCity: { type: DataTypes.STRING(100), allowNull: true },
  contactPhone: { type: DataTypes.STRING(40), allowNull: true },
  deliveryWindow: { type: DataTypes.STRING(80), allowNull: true },
  deliveryCharge: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
  buyerNote: { type: DataTypes.TEXT, allowNull: true },
  sellerNote: { type: DataTypes.TEXT, allowNull: true },
  trackingLocation: { type: DataTypes.STRING(120), allowNull: true },
  deliveredAt: { type: DataTypes.DATE, allowNull: true },
  deliveryResponseDeadline: { type: DataTypes.DATE, allowNull: true },
  deliveryResolution: { type: DataTypes.STRING(32), allowNull: true },
  productSnapshot: { type: DataTypes.JSONB, allowNull: true }
}, { tableName: 'order_items', timestamps: true, indexes: [{ fields: ['orderId'] },{ fields: ['sellerId'] },{ fields: ['productId'] },{ fields: ['fulfillmentStatus'] },{ fields: ['deliveryResponseDeadline'] }] });
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
module.exports = OrderItem;
