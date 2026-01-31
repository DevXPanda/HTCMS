import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const WaterConnection = sequelize.define('WaterConnection', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  connectionNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Unique water connection number'
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
  meterNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Water meter serial number'
  },
  connectionDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Date when connection was established'
  },
  disconnectionDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date when connection was disconnected (if applicable)'
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'ACTIVE', 'DISCONNECTED'),
    allowNull: false,
    defaultValue: 'ACTIVE',
    comment: 'Connection status: DRAFT, ACTIVE, or DISCONNECTED'
  },
  connectionType: {
    type: DataTypes.ENUM('domestic', 'commercial', 'industrial'),
    allowNull: false,
    comment: 'Type of water connection'
  },
  isMetered: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether the connection has a meter'
  },
  pipeSize: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Pipe size in inches (e.g., 0.5, 1, 1.5)'
  },
  monthlyRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Monthly fixed rate for water connection'
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
    },
    comment: 'User who created the connection'
  }
}, {
  tableName: 'water_connections',
  timestamps: true
});
