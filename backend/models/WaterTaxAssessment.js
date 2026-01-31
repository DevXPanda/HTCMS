import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const WaterTaxAssessment = sequelize.define('WaterTaxAssessment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  assessmentNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Unique assessment number'
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Properties',
      key: 'id'
    },
    comment: 'Foreign key to properties table'
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
  assessmentYear: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Year for which assessment is made'
  },
  assessmentType: {
    type: DataTypes.ENUM('METERED', 'FIXED'),
    allowNull: false,
    comment: 'Type of assessment: METERED or FIXED'
  },
  rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Rate per unit (for metered) or fixed rate (for fixed)'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional remarks or notes'
  },
  status: {
    type: DataTypes.ENUM('draft', 'pending', 'approved', 'rejected'),
    defaultValue: 'draft',
    comment: 'Assessment status'
  },
  assessorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'User who created the assessment'
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'User who approved the assessment'
  },
  approvalDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date when assessment was approved'
  }
}, {
  tableName: 'water_tax_assessments',
  timestamps: true
});
