// ============================================================
//  models/Bid.js  (Muhammad Nosherwan – 076926)
//  Bid model – stored in bids_db
// ============================================================
const { DataTypes } = require('sequelize');
const bidsDB = require('../config/db.bids');

const Bid = bidsDB.define('Bid', {
  id: {
    type:         DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey:   true
  },
  // The wholesaler/retailer who created the bulk request
  requestedById: {
    type:      DataTypes.UUID,
    allowNull: false
  },
  // Cross-db reference to products_db
  productId: {
    type:      DataTypes.UUID,
    allowNull: false
  },
  requiredQuantity: {
    type:      DataTypes.INTEGER,
    allowNull: false,
    validate:  { min: 1 }
  },
  notes: {
    type:      DataTypes.TEXT,
    allowNull: true
  },
  // Status of the bulk request itself
  requestStatus: {
    type:         DataTypes.ENUM('Open', 'Closed', 'Cancelled'),
    allowNull:    false,
    defaultValue: 'Open'
  }
}, {
  tableName:  'bid_requests',
  timestamps: true
});

// ── BidOffer: individual supplier bids on a request ──────────
const BidOffer = bidsDB.define('BidOffer', {
  id: {
    type:         DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey:   true
  },
  // Cross-db reference to bid_requests table
  bidRequestId: {
    type:      DataTypes.UUID,
    allowNull: false
  },
  // Cross-db reference to users_db (Supplier)
  supplierId: {
    type:      DataTypes.UUID,
    allowNull: false
  },
  bidAmount: {
    type:      DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate:  { min: 0 }
  },
  status: {
    type:         DataTypes.ENUM('Submitted', 'Accepted', 'Rejected', 'Cancelled'),
    allowNull:    false,
    defaultValue: 'Submitted'
  }
}, {
  tableName:  'bid_offers',
  timestamps: true
});

// Sync both tables
bidsDB.sync({ alter: true })
  .then(() => console.log('📋 bids tables synced.'))
  .catch(err => console.error('❌ bids tables sync failed:', err.message));

module.exports = { Bid, BidOffer };
