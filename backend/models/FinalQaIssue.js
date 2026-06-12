const { DataTypes } = require('sequelize');
const adminDb = require('../config/db.payments');

const FinalQaIssue = adminDb.define('FinalQaIssue', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  moduleName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  priority: {
    type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
    allowNull: false,
    defaultValue: 'Medium',
  },
  status: {
    type: DataTypes.ENUM('Open', 'In Progress', 'Resolved'),
    allowNull: false,
    defaultValue: 'Open',
  },
  assignedTo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'final_qa_issues',
  timestamps: true,
});

module.exports = FinalQaIssue;
