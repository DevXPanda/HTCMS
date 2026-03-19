import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const PaymentApprovalRequest = sequelize.define('PaymentApprovalRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  requestType: {
    type: DataTypes.ENUM('DISCOUNT', 'PENALTY_WAIVER'),
    allowNull: false,
    field: 'request_type'
  },
  moduleType: {
    type: DataTypes.ENUM('PROPERTY', 'WATER', 'SHOP', 'D2DC', 'UNIFIED'),
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
  adjustmentType: {
    type: DataTypes.ENUM('PERCENTAGE', 'FIXED'),
    allowNull: false,
    field: 'adjustment_type'
  },
  adjustmentValue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    field: 'adjustment_value'
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
  requestedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'admin_management', key: 'id' },
    field: 'requested_by'
  },
  requestedByName: {
    type: DataTypes.STRING(150),
    allowNull: true,
    field: 'requested_by_name'
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    field: 'approved_by'
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at'
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'rejection_reason'
  },
  forwardedCollectorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'admin_management', key: 'id' },
    field: 'forwarded_collector_id'
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
    allowNull: false,
    defaultValue: 'PENDING'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true
  }
}, {
  tableName: 'payment_approval_requests',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});
