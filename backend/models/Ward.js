import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Ward = sequelize.define('Ward', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  wardNumber: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  wardName: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  collectorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'admin_management',
      key: 'id'
    },
    comment: 'Assigned Tax Collector (Staff)'
  },
  clerkId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'clerkid',
    references: {
      model: 'admin_management',
      key: 'id'
    },
    comment: 'Assigned Clerk (admin_management)'
  },
  inspectorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'inspectorid',
    references: {
      model: 'admin_management',
      key: 'id'
    },
    comment: 'Assigned Inspector'
  },
  officerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'officerid',
    references: {
      model: 'admin_management',
      key: 'id'
    },
    comment: 'Assigned Officer'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  boundary_coordinates: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON array of [lat,lng] forming closed polygon for geo-fence'
  }
}, {
  tableName: 'wards',
  timestamps: true
});
