import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const PenaltyRule = sequelize.define('PenaltyRule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  financialYear: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: 'Financial year this rule applies to (e.g., 2024-25). Use "ALL" for all years'
  },
  ruleName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Human-readable name for this rule'
  },
  penaltyType: {
    type: DataTypes.ENUM('flat', 'percentage'),
    allowNull: false,
    comment: 'Type of penalty: flat amount or percentage'
  },
  penaltyValue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Penalty amount (if flat) or percentage rate (if percentage)'
  },
  penaltyFrequency: {
    type: DataTypes.ENUM('one_time', 'monthly', 'daily'),
    allowNull: false,
    defaultValue: 'monthly',
    comment: 'How often penalty is applied: one_time, monthly, or daily'
  },
  penaltyBase: {
    type: DataTypes.ENUM('base_amount', 'total_amount', 'balance_amount'),
    allowNull: false,
    defaultValue: 'base_amount',
    comment: 'What amount penalty is calculated on: base_amount, total_amount, or balance_amount'
  },
  interestType: {
    type: DataTypes.ENUM('none', 'flat', 'percentage'),
    allowNull: false,
    defaultValue: 'percentage',
    comment: 'Type of interest: none, flat amount, or percentage'
  },
  interestValue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0,
    comment: 'Interest amount (if flat) or percentage rate per period (if percentage)'
  },
  interestFrequency: {
    type: DataTypes.ENUM('monthly', 'daily'),
    allowNull: true,
    defaultValue: 'monthly',
    comment: 'How often interest is calculated: monthly or daily'
  },
  interestBase: {
    type: DataTypes.ENUM('base_amount', 'total_amount', 'balance_amount'),
    allowNull: false,
    defaultValue: 'balance_amount',
    comment: 'What amount interest is calculated on'
  },
  gracePeriodDays: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of days after due date before penalty/interest applies'
  },
  maxPenaltyAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    comment: 'Maximum penalty amount cap (null = no limit)'
  },
  maxInterestAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    comment: 'Maximum interest amount cap (null = no limit)'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether this rule is currently active'
  },
  effectiveFrom: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Date from which this rule is effective'
  },
  effectiveTo: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date until which this rule is effective (null = indefinite)'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of this penalty rule'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  tableName: 'penalty_rules',
  timestamps: true,
  indexes: [
    {
      fields: ['financialYear', 'isActive']
    },
    {
      fields: ['isActive']
    }
  ]
});
