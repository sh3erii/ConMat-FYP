const { DataTypes } = require('sequelize');
const ordersDB = require('../config/db.orders');
const Order = require('./Order');

const OrderItem = ordersDB.define('OrderItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Cross-database reference to products_db.products.id'
  },
  sellerId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Cross-database reference to users_db.users.id'
  },
  productName: {
    type: DataTypes.STRING(160),
    allowNull: false
  },
  category: {
    type: DataTypes.STRING(60),
    allowNull: true
  },
  unit: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'piece'
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 }
  },
  pricingType: {
    type: DataTypes.ENUM('retail', 'wholesale'),
    allowNull: false,
    defaultValue: 'retail'
  },
  unitPrice: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  lineTotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  productSnapshot: {
    type: DataTypes.JSONB,
    allowNull: true
  }
}, {
  tableName: 'order_items',
  timestamps: true,
  indexes: [
    { fields: ['orderId'] },
    { fields: ['productId'] },
    { fields: ['sellerId'] }
  ]
});

Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

ordersDB.sync({ alter: true })
  .then(() => console.log('📋 order_items table synced.'))
  .catch((err) => console.error('❌ order_items table sync failed:', err.message));

module.exports = OrderItem;
