import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Tax Assessment Model
// Note: Model name remains 'Assessment' for backward compatibility
// Display name is 'Tax Assessment' throughout the system
export const Assessment = sequelize.define('Assessment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  assessmentNumber: {
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
  assessmentYear: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  assessedValue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Total assessed value of the property'
  },
  taxRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    comment: 'Tax rate percentage'
  },
  annualTaxAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Annual tax amount calculated'
  },
  assessmentDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.ENUM('draft', 'pending', 'approved', 'rejected'),
    defaultValue: 'draft'
  },
  assessorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  approvalDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Additional fields for enhanced assessment
  landValue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    comment: 'Value of the land'
  },
  buildingValue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    comment: 'Value of the building/construction'
  },
  depreciation: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0,
    comment: 'Depreciation amount'
  },
  exemptionAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0,
    comment: 'Exemption amount if any'
  },
  effectiveDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date from which assessment is effective'
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date until which assessment is valid'
  },
  revisionNumber: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    comment: 'Number of times assessment has been revised'
  },
  previousAssessmentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Assessments',
      key: 'id'
    },
    comment: 'Reference to previous assessment if revised'
  }
}, {
  tableName: 'assessments',
  timestamps: true
});
