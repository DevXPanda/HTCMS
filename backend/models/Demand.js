import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Demand = sequelize.define('Demand', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  demandNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Properties',
      key: 'id'
    }
  },
  assessmentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Assessments',
      key: 'id'
    }
  },
  financialYear: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: 'Format: 2024-25'
  },
  baseAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Base tax amount from assessment'
  },
  arrearsAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Arrears from previous years'
  },
  penaltyAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Penalty for late payment'
  },
  interestAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Interest on overdue amount'
  },
  totalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Total amount due (base + arrears + penalty + interest)'
  },
  paidAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Total amount paid so far'
  },
  balanceAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Balance amount to be paid'
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'partially_paid', 'paid', 'overdue', 'cancelled'),
    defaultValue: 'pending'
  },
  generatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  generatedDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  lastPenaltyAppliedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last date when penalty/interest was applied'
  },
  overdueDays: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of days overdue'
  },
  penaltyBreakdown: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'JSON array tracking penalty/interest history: [{date, penalty, interest, reason}]'
  }
}, {
  tableName: 'demands',
  timestamps: true
});
