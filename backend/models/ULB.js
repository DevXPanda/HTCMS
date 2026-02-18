import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const ULB = sequelize.define('ULB', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  state: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  district: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'ACTIVE',
    validate: {
      isIn: [['ACTIVE', 'INACTIVE']]
    }
  }
}, {
  tableName: 'ulbs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});
