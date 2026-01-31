import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const WaterConnectionRequest = sequelize.define('WaterConnectionRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  requestNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Unique request number'
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
  requestedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'User who requested the connection'
  },
  propertyLocation: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Detailed property location/address for connection'
  },
  connectionType: {
    type: DataTypes.ENUM('domestic', 'commercial', 'industrial'),
    allowNull: false,
    comment: 'Type of water connection requested'
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'),
    allowNull: false,
    defaultValue: 'PENDING',
    comment: 'Request status'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional remarks from citizen'
  },
  adminRemarks: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Remarks from admin when approving/rejecting'
  },
  processedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'Admin who processed the request'
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date when request was processed'
  },
  waterConnectionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'WaterConnections',
      key: 'id'
    },
    comment: 'Water connection created from this request (if approved)'
  }
}, {
  tableName: 'water_connection_requests',
  timestamps: true
});
