import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const ShopRegistrationRequest = sequelize.define('ShopRegistrationRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  requestNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'request_number', // Explicit field mapping for snake_case
    comment: 'Unique request number (e.g., SRR-2024-00001)'
    // Unique constraint is handled by index below
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'properties',
      key: 'id'
    },
    comment: 'Property where shop will be located'
  },
  applicantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Citizen user applying for shop registration'
  },
  shopName: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: 'Name of the shop'
  },
  shopType: {
    type: DataTypes.ENUM('retail', 'wholesale', 'service', 'restaurant', 'hotel', 'other'),
    allowNull: false,
    defaultValue: 'retail',
    comment: 'Type of shop'
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Shop category/subcategory'
  },
  area: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Shop area in square meters'
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Shop address (if different from property address)'
  },
  tradeLicenseNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Existing trade license number (if any)'
  },
  documents: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of document references/URLs'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'Request status'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Remarks from applicant'
  },
  adminRemarks: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Remarks from admin/clerk when reviewing'
  },
  reviewedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Admin or clerk who reviewed the request'
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When request was reviewed'
  },
  shopId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'shops',
      key: 'id'
    },
    comment: 'Shop created from this request (if approved)'
  }
}, {
  tableName: 'shop_registration_requests',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['request_number'] // Use snake_case to match database column
    },
    {
      fields: ['property_id'] // Use snake_case
    },
    {
      fields: ['applicant_id'] // Use snake_case
    },
    {
      fields: ['status']
    },
    {
      fields: ['shop_id'] // Use snake_case
    }
  ]
});
