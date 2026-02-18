import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const WorkerPayroll = sequelize.define('WorkerPayroll', {
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
  period_month: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  period_year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  present_days: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  payable_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  daily_rate_used: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  eo_verification_status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'pending'
  },
  eo_verified_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  eo_verified_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'admin_management', key: 'id' }
  },
  admin_approval_status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'pending'
  },
  admin_approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  admin_approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'admin_management', key: 'id' }
  }
}, {
  tableName: 'worker_payroll',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});
