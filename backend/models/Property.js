import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';



export const Property = sequelize.define('Property', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  propertyNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Admin-entered reference (e.g. 94) or same as unique_code when not provided'
  },
  uniqueCode: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true,
    field: 'unique_code',
    comment: 'System-generated unique ID (e.g. PR0230055); always set on create'
  },
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  ownerName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Direct owner name (if different from User)'
  },
  ownerPhone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  wardId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Wards',
      key: 'id'
    }
  },
  propertyType: {
    type: DataTypes.ENUM('residential', 'commercial', 'industrial', 'agricultural', 'mixed'),
    allowNull: false
  },
  usageType: {
    type: DataTypes.ENUM('residential', 'commercial', 'industrial', 'agricultural', 'mixed', 'institutional'),
    allowNull: true,
    comment: 'Actual usage type of the property'
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  state: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  pincode: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  area: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Area in square meters'
  },
  builtUpArea: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  floors: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1
  },
  constructionType: {
    type: DataTypes.ENUM('RCC', 'Pucca', 'Kutcha', 'Semi-Pucca'),
    allowNull: true
  },
  constructionYear: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  geolocation: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Stores {latitude, longitude} coordinates'
  },
  photos: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of photo URLs/paths'
  },
  occupancyStatus: {
    type: DataTypes.ENUM('owner_occupied', 'tenant_occupied', 'vacant'),
    defaultValue: 'owner_occupied'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'pending', 'disputed'),
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
  tableName: 'properties',
  timestamps: true
});