import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const WaterBill = sequelize.define('WaterBill', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  billNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Unique water bill number'
  },
  waterConnectionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'WaterConnections',
      key: 'id'
    },
    comment: 'Foreign key to water_connections table'
  },
  meterReadingId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'WaterMeterReadings',
      key: 'id'
    },
    comment: 'Foreign key to water_meter_readings table (if bill is based on reading)'
  },
  billingPeriod: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'Billing period (e.g., "2024-01" for January 2024)'
  },
  consumption: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Water consumption for the billing period'
  },
  fixedCharge: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Fixed monthly charge'
  },
  consumptionCharge: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Charge based on consumption'
  },
  arrearsAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Arrears from previous bills'
  },
  penaltyAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Penalty for late payment'
  },
  interestAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Interest on overdue amount'
  },
  totalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Total bill amount (fixed + consumption + arrears + penalty + interest)'
  },
  paidAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Amount paid so far'
  },
  balanceAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Balance amount to be paid'
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Due date for payment'
  },
  billDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Date when bill was generated'
  },
  status: {
    type: DataTypes.ENUM('pending', 'partially_paid', 'paid', 'overdue', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'Bill payment status'
  },
  generatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'User who generated the bill'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'water_bills',
  timestamps: true
});
