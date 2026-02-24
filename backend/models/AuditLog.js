import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  actorUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    // Removed foreign key constraint - staff users (clerk, inspector, officer) are in admin_management table
    // and citizens/collectors can be in either Users or admin_management table
    comment: 'User who performed the action (null for system actions or when user is from admin_management table)'
  },
  actorRole: {
    type: DataTypes.ENUM('admin', 'assessor', 'cashier', 'collector', 'citizen', 'clerk', 'inspector', 'system'),
    allowNull: false,
    comment: 'Role of the user who performed the action'
  },
  actionType: {
    type: DataTypes.ENUM('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'RETURN', 'PAY', 'LOGIN', 'LOGOUT', 'ASSIGN', 'ESCALATE', 'SEND', 'RESOLVE', 'PENALTY_APPLIED', 'RECEIPT_PDF_GENERATED', 'NOTICE_PDF_GENERATED', 'RECEIPT_PDF_DOWNLOADED', 'NOTICE_PDF_DOWNLOADED', 'FIELD_VISIT', 'FOLLOW_UP', 'TASK_GENERATED', 'TASK_COMPLETED', 'NOTICE_TRIGGERED', 'ENFORCEMENT_ELIGIBLE', 'VIEW', 'PAYMENT_COLLECTED'),
    allowNull: false,
    comment: 'Type of action performed'
  },
  entityType: {
    type: DataTypes.ENUM(
      'User', 'Property', 'Assessment', 'Demand', 'Payment', 'Ward', 'Notice',
      'Attendance', 'FieldVisit', 'FollowUp', 'CollectorTask', 'PropertyApplication',
      'WaterConnectionRequest', 'D2DC', 'ShopRegistrationRequest',
      'ToiletFacility', 'ToiletInspection', 'ToiletMaintenance', 'ToiletStaffAssignment', 'ToiletComplaint',
      'MrfFacility', 'MrfSale',
      'GauShalaFacility', 'GauShalaCattle', 'GauShalaComplaint', 'GauShalaFeedingRecord', 'GauShalaInspection', 'CattleMedicalRecord',
      'Worker', 'WorkerAttendance', 'WorkerPayroll', 'WorkerTask',
      'InventoryItem', 'InventoryTransaction', 'FacilityUtilityBill', 'CitizenFeedback',
      'Alert', 'ULB', 'TaxDiscount', 'PenaltyWaiver'
    ),
    allowNull: false,
    comment: 'Type of entity affected'
  },
  entityId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of the affected entity (null for LOGIN/LOGOUT)'
  },
  previousData: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'JSON snapshot of data before change'
  },
  newData: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'JSON snapshot of data after change'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'IP address of the actor'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'User agent string'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Human-readable description of the action'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional metadata (e.g., propertyId for demand actions)'
  }
}, {
  tableName: 'audit_logs',
  timestamps: true,
  createdAt: 'timestamp',
  updatedAt: false, // Audit logs are append-only, never updated
  indexes: [
    {
      fields: ['actorUserId']
    },
    {
      fields: ['actorRole']
    },
    {
      fields: ['actionType']
    },
    {
      fields: ['entityType']
    },
    {
      fields: ['entityId']
    },
    {
      fields: ['timestamp']
    },
    {
      fields: ['entityType', 'entityId']
    },
    {
      fields: ['actorUserId', 'timestamp']
    }
  ]
});
