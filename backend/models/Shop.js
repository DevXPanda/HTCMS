import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Shop = sequelize.define('Shop', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  shopNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Unique shop number e.g. SH-2024-00001'
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Properties',
      key: 'id'
    },
    comment: 'Property where shop is located (required for Demand/Payment propertyId)'
  },
  wardId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Wards',
      key: 'id'
    }
  },
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'Citizen/trader who owns or runs the shop'
  },
  shopName: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  shopType: {
    type: DataTypes.ENUM('retail', 'wholesale', 'food_stall', 'service', 'other'),
    allowNull: false,
    defaultValue: 'retail'
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Rate category or slab for tax calculation'
  },
  area: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Area in square feet'
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Address if different from property'
  },
  contactName: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  contactPhone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  tradeLicenseNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Trade license number'
  },
  licenseValidFrom: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'License valid from date'
  },
  licenseValidTo: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'License valid to date'
  },
  licenseStatus: {
    type: DataTypes.ENUM('valid', 'expired', 'suspended'),
    allowNull: true,
    comment: 'License status: valid, expired, or suspended'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'closed'),
    allowNull: false,
    defaultValue: 'active'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
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
  tableName: 'shops',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['shopNumber'] },
    { fields: ['propertyId'] },
    { fields: ['wardId'] },
    { fields: ['ownerId'] },
    { fields: ['status'] },
    { fields: ['licenseStatus'] }
  ]
});
