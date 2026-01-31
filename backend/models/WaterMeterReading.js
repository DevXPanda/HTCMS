import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const WaterMeterReading = sequelize.define('WaterMeterReading', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  readingNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Unique meter reading number'
  },
  waterConnectionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'WaterConnections',
      key: 'id'
    },
    comment: 'Foreign key to water_connections table'
  },
  readingDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Date when reading was taken'
  },
  currentReading: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Current meter reading value'
  },
  previousReading: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Previous meter reading value'
  },
  consumption: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Water consumption (current - previous) in units'
  },
  readingType: {
    type: DataTypes.ENUM('actual', 'estimated', 'corrected'),
    allowNull: false,
    defaultValue: 'actual',
    comment: 'Type of reading: actual, estimated, or corrected'
  },
  readerName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Name of person who took the reading'
  },
  readerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'User ID of the meter reader'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  photoUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'URL/path to photo of meter reading'
  }
}, {
  tableName: 'water_meter_readings',
  timestamps: true
});
