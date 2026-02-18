import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const WorkerTask = sequelize.define('WorkerTask', {
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
    allowNull: false,
    references: { model: 'admin_management', key: 'id' }
  },
  ward_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'wards', key: 'id' }
  },
  ulb_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'ulbs', key: 'id' }
  },
  task_type: {
    type: DataTypes.ENUM('SWEEPING', 'TOILET', 'MRF', 'OTHER'),
    allowNull: false
  },
  area_street: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  shift: {
    type: DataTypes.ENUM('MORNING', 'EVENING'),
    allowNull: false
  },
  special_instructions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'),
    allowNull: false,
    defaultValue: 'ASSIGNED'
  },
  assigned_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  before_photo_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  before_photo_latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true
  },
  before_photo_longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true
  },
  before_photo_address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  after_photo_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  after_photo_latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true
  },
  after_photo_longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true
  },
  after_photo_address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  work_proof_remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  escalation_flag: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  escalation_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'worker_tasks',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});
