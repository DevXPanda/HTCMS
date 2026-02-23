import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const TaxDiscount = sequelize.define('TaxDiscount', {
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
  discountType: {
    type: DataTypes.ENUM('PERCENTAGE', 'FIXED'),
    allowNull: false,
    field: 'discount_type'
  },
  discountValue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    field: 'discount_value'
  },
  discountAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    field: 'discount_amount'
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
  tableName: 'tax_discounts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});
