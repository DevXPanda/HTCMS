import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const WaterConnectionDocument = sequelize.define('WaterConnectionDocument', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  waterConnectionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Foreign key to water_connections table'
  },
  waterConnectionRequestId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'waterconnectionrequestid', // Map to actual database column name
    references: {
      model: 'WaterConnectionRequests',
      key: 'id'
    },
    comment: 'Foreign key to water_connection_requests table'
  },
  documentType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Type of document (APPLICATION_FORM, ID_PROOF, ADDRESS_PROOF, etc.)'
  },
  documentName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Display name of the document'
  },
  fileName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Stored filename on server'
  },
  filePath: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: 'Full path to the file'
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'File size in bytes'
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'MIME type of the file'
  },
  uploadedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User who uploaded the document (can be from Users or AdminManagement table)'
  },
  uploadedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Date when document was uploaded'
  }
}, {
  tableName: 'water_connection_documents',
  timestamps: true
});
