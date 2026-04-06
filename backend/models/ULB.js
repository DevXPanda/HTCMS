import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const ULB_TYPES = ['NAGAR_NIGAM', 'NAGAR_PALIKA_PARISHAD', 'NAGAR_PANCHAYAT'];

export const ULB = sequelize.define('ULB', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  ulb_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    validate: {
      isIn: [ULB_TYPES]
    }
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
  address_line_1: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  address_line_2: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  pincode: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  email: {
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
