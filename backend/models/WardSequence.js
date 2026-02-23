import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * Ward-wise sequences for transaction-safe unique ID generation.
 * Composite key (moduleKey, wardId) ensures one sequence per module per ward.
 * Used for: Property (PR/PC/PI/PA), Water (WT), Shop (ST), D2DC (D2).
 */
export const WardSequence = sequelize.define('WardSequence', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  moduleKey: {
    type: DataTypes.STRING(30),
    allowNull: false,
    field: 'module_key'
  },
  wardId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'ward_id',
    references: {
      model: 'wards',
      key: 'id'
    }
  },
  lastSequence: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'last_sequence'
  }
}, {
  tableName: 'ward_sequences',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['module_key', 'ward_id'] },
    { fields: ['ward_id'] }
  ]
});
