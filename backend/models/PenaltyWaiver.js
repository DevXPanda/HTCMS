import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const PenaltyWaiver = sequelize.define('PenaltyWaiver', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  moduleType: {
    type: DataTypes.ENUM('PROPERTY', 'WATER', 'SHOP', 'D2DC'),
    allowNull: false,
    field: 'module_type'
  },
  entityId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'entity_id'
  },
  demandId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'demands', key: 'id' },
    field: 'demand_id'
  },
  waiverType: {
    type: DataTypes.ENUM('PERCENTAGE', 'FIXED'),
    allowNull: false,
    field: 'waiver_type'
  },
  waiverValue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    field: 'waiver_value'
  },
  waiverAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    field: 'waiver_amount'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  documentUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'document_url'
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'approved_by'
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'REVOKED'),
    allowNull: false,
    defaultValue: 'ACTIVE'
  }
}, {
  tableName: 'penalty_waivers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});
