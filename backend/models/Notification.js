import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'User.id or AdminManagement.id'
  },
  userType: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'user',
    comment: 'user | admin_management'
  },
  role: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'admin, collector, citizen, clerk, etc.'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  link: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Frontend path or URL to open when clicked'
  },
  read: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'notifications',
  underscored: true,
  indexes: [
    { fields: ['user_id', 'user_type'] },
    { fields: ['read', 'created_at'] }
  ]
});
