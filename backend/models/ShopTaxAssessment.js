import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const ShopTaxAssessment = sequelize.define('ShopTaxAssessment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  assessmentNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Unique assessment number e.g. STA-2024-00001'
  },
  shopId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Shops',
      key: 'id'
    }
  },
  assessmentYear: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Year for which assessment is made'
  },
  financialYear: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Format: 2024-25'
  },
  assessedValue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    comment: 'Assessed value for tax calculation'
  },
  rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Rate applied (e.g. per sq ft or flat rate)'
  },
  annualTaxAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Annual tax amount'
  },
  status: {
    type: DataTypes.ENUM('draft', 'pending', 'approved', 'rejected'),
    allowNull: false,
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
  }
}, {
  tableName: 'shop_tax_assessments',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['assessmentNumber'] },
    { fields: ['shopId'] },
    { unique: true, fields: ['shopId', 'assessmentYear'], name: 'shop_tax_assessments_shop_year_unique' },
    { fields: ['status'] }
  ]
});
