import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Alert = sequelize.define('Alert', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  alert_type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  severity: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'warning'
  },
  entity_type: {
    type: DataTypes.STRING(30),
    allowNull: false
  },
  entity_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  eo_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'admin_management', key: 'id' }
  },
  ward_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'wards', key: 'id' }
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  sms_sent: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  sms_sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  acknowledged: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  acknowledged_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  acknowledged_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'admin_management', key: 'id' }
  }
}, {
  tableName: 'alerts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});
