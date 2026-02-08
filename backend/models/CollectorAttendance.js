import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const CollectorAttendance = sequelize.define('CollectorAttendance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  collectorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Foreign key to Users or AdminManagement table (collector)'
  },
  usertype: {
    type: DataTypes.ENUM('user', 'admin_management'),
    allowNull: false,
    defaultValue: 'user',
    comment: 'Type of collector: user (legacy) or admin_management (staff)'
  },
  loginAt: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Timestamp when collector logged in (punch in)'
  },
  logoutAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when collector logged out (punch out)'
  },
  workingDurationMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Calculated working duration in minutes (set on logout)'
  },
  loginLatitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    comment: 'GPS latitude at login time'
  },
  loginLongitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
    comment: 'GPS longitude at login time'
  },
  loginAddress: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reverse geocoded address at login time'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: false,
    comment: 'IP address at login time'
  },
  deviceType: {
    type: DataTypes.ENUM('mobile', 'desktop', 'tablet'),
    allowNull: false,
    defaultValue: 'desktop',
    comment: 'Device type: mobile, desktop, or tablet'
  },
  browserName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Browser name (e.g., Chrome, Firefox, Safari)'
  },
  operatingSystem: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Operating system (e.g., Windows, macOS, Android, iOS)'
  },
  source: {
    type: DataTypes.ENUM('web', 'mobile'),
    allowNull: false,
    defaultValue: 'web',
    comment: 'Source: web or mobile app'
  },
  isAutoMarked: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Always true - attendance is automatically marked'
  }
}, {
  tableName: 'collector_attendance',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: false, // Append-only after logout
  indexes: [
    {
      fields: ['collectorId']
    },
    {
      fields: ['loginAt']
    },
    {
      fields: ['collectorId', 'loginAt']
    },
    {
      fields: ['collectorId', 'logoutAt'],
      where: {
        logoutAt: null
      },
      name: 'collector_attendance_active_session_idx'
    }
  ],
  hooks: {
    beforeUpdate: async (attendance) => {
      // If record already has logoutAt, prevent any updates (immutable after logout)
      if (attendance.previous('logoutAt')) {
        throw new Error('Cannot update attendance record after logout. Records are immutable once logged out.');
      }
      
      // Prevent changing logoutAt if it was already set
      if (attendance.changed('logoutAt') && attendance.previous('logoutAt')) {
        throw new Error('Cannot update logoutAt after it has been set');
      }
      
      // Calculate working duration on logout
      if (attendance.changed('logoutAt') && attendance.logoutAt && !attendance.previous('logoutAt')) {
        const loginTime = new Date(attendance.loginAt);
        const logoutTime = new Date(attendance.logoutAt);
        const durationMs = logoutTime - loginTime;
        attendance.workingDurationMinutes = Math.floor(durationMs / (1000 * 60));
      }
    }
  }
});
