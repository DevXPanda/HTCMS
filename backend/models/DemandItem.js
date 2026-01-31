import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * Tax Demand Item Model
 * Stores individual tax items within a unified demand
 */
export const DemandItem = sequelize.define('DemandItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  demandId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'demands',
      key: 'id'
    },
    comment: 'Foreign key to demands table'
  },
  taxType: {
    type: DataTypes.ENUM('PROPERTY', 'WATER'),
    allowNull: false,
    comment: 'Type of tax: PROPERTY or WATER'
  },
  referenceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Reference to assessment ID (property assessment or water tax assessment)'
  },
  connectionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'water_connections',
      key: 'id'
    },
    comment: 'Water connection ID (only for WATER tax type)'
  },
  baseAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Base tax amount for this item'
  },
  arrearsAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Arrears amount for this item'
  },
  penaltyAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Penalty amount for this item'
  },
  interestAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Interest amount for this item'
  },
  totalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Total amount for this item (base + arrears + penalty + interest)'
  },
  paidAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'paidamount', // Map to lowercase database column
    comment: 'Amount paid for this item (item-level payment tracking)'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of this demand item'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional metadata (e.g., connection details, assessment details)'
  }
}, {
  tableName: 'tax_demand_items',
  timestamps: true,
  indexes: [
    {
      fields: ['demandId']
    },
    {
      fields: ['taxType']
    },
    {
      fields: ['referenceId']
    },
    {
      fields: ['connectionId']
    }
  ],
  hooks: {
    beforeValidate: (demandItem) => {
      // Ensure paidAmount is not negative
      if (demandItem.paidAmount < 0) {
        throw new Error('Paid amount cannot be negative');
      }
      
      // Ensure paidAmount does not exceed totalAmount
      if (demandItem.paidAmount > demandItem.totalAmount) {
        throw new Error('Paid amount cannot exceed total amount');
      }
    },
    beforeUpdate: (demandItem) => {
      // Re-validate on update
      if (demandItem.paidAmount < 0) {
        throw new Error('Paid amount cannot be negative');
      }
      
      if (demandItem.paidAmount > demandItem.totalAmount) {
        throw new Error('Paid amount cannot exceed total amount');
      }
    }
  }
});
