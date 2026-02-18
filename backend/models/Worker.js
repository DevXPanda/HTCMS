import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Worker = sequelize.define('Worker', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  employee_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  full_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  mobile: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  worker_type: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  ward_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'wards', key: 'id' }
  },
  ulb_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'ulbs', key: 'id' }
  },
  supervisor_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'admin_management', key: 'id' }
  },
  eo_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'admin_management', key: 'id' }
  },
  contractor_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'admin_management', key: 'id' }
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'ACTIVE'
  },
  daily_rate: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  }
}, {
  tableName: 'workers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});
