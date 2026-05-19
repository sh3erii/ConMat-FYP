// ============================================================
//  models/Order.js  (Muhammad Nosherwan – 076926)
//  Order model – stored in orders_db
// ============================================================
const { DataTypes } = require('sequelize');
const ordersDB = require('../config/db.orders');

const Order = ordersDB.define('Order', {
  id: {
    type:         DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey:   true
  },
  // buyerId references users_db (cross-db reference, stored as UUID string)
  buyerId: {
    type:      DataTypes.UUID,
    allowNull: false
  },
  // supplierId references users_db
  supplierId: {
    type:      DataTypes.UUID,
    allowNull: false
  },
  // productId references products_db
  productId: {
    type:      DataTypes.UUID,
    allowNull: false
  },
  quantity: {
    type:      DataTypes.INTEGER,
    allowNull: false,
    validate:  { min: 1 }
  },
  totalAmount: {
    type:      DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  shippingAddress: {
    type:      DataTypes.TEXT,
    allowNull: false
  },
  // Order lifecycle: Created → Pending → Paid → Completed | Cancelled
  status: {
    type:         DataTypes.ENUM('Created', 'Pending', 'Paid', 'Completed', 'Cancelled'),
    allowNull:    false,
    defaultValue: 'Created'
  },
  // paymentId stored after Stripe confirms payment
  paymentId: {
    type:      DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName:  'orders',
  timestamps: true
});

ordersDB.sync({ alter: true })
  .then(() => console.log('📋 orders table synced.'))
  .catch(err => console.error('❌ orders table sync failed:', err.message));

module.exports = Order;
