import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const WorkerAttendance = sequelize.define('WorkerAttendance', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  worker_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'workers', key: 'id' }
  },
  supervisor_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'admin_management', key: 'id' }
  },
  ward_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'wards', key: 'id' }
  },
  eo_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'admin_management', key: 'id' }
  },
  ulb_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'ulbs', key: 'id' }
  },
  attendance_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  checkin_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true
  },
  photo_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  geo_status: {
    type: DataTypes.STRING(20),
    allowNull: true
  }
}, {
  tableName: 'worker_attendance',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});
