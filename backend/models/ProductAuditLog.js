const { DataTypes } = require('sequelize');
const productsDb = require('../config/db.products');

const ProductAuditLog = productsDb.define('ProductAuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  productCode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  previousStatus: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  newStatus: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  previousStock: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  newStock: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  adminId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'product_audit_logs',
  timestamps: true,
});

module.exports = ProductAuditLog;
