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
      model: 'properties',
      key: 'id'
    },
    comment: 'Foreign key to properties table'
  },
  requestedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
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
    type: DataTypes.ENUM('DRAFT', 'SUBMITTED', 'UNDER_INSPECTION', 'ESCALATED_TO_OFFICER', 'APPROVED', 'REJECTED', 'RETURNED', 'COMPLETED'),
    allowNull: false,
    defaultValue: 'DRAFT',
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
  returnReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reason for returning application to clerk'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Clerk who created this application (if applicable)'
  },
  submittedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When application was submitted for inspection'
  },
  inspectedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Assessor who inspected the application'
  },
  inspectedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When inspection was completed'
  },
  escalatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Inspector who escalated the request to officer'
  },
  escalatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When request was escalated to officer'
  },
  processedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
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
      model: 'water_connections',
      key: 'id'
    },
    comment: 'Water connection created from this request (if approved)'
  },
  officerremarks: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'officerremarks',
    comment: 'Remarks from officer when making final decision'
  },
  decidedby: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'decidedby',
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Officer who made the final decision'
  },
  decidedat: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'decidedat',
    comment: 'When officer made the final decision'
  }
}, {
  tableName: 'water_connection_requests',
  timestamps: true
});
