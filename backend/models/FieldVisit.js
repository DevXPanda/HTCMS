import { DataTypes, Op } from 'sequelize';
import { sequelize } from '../config/database.js';

export const FieldVisit = sequelize.define('FieldVisit', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  visitNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Auto-generated unique visit number (e.g., FV-2024-001)'
  },
  collectorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'Collector who made the visit'
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Properties',
      key: 'id'
    },
    comment: 'Property visited'
  },
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'Property owner (Citizen)'
  },
  demandId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Demands',
      key: 'id'
    },
    comment: 'Demand for which visit was made'
  },
  visitDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Date and time of visit (auto-captured)'
  },
  visitType: {
    type: DataTypes.ENUM('reminder', 'payment_collection', 'warning', 'final_warning', 'garbage_collection'),
    allowNull: false,
    comment: 'Type of visit: reminder, payment_collection, warning, final_warning, garbage_collection'
  },
  visitPurpose: {
    type: DataTypes.ENUM('house_tax', 'garbage_collection', 'both'),
    allowNull: true,
    defaultValue: 'house_tax',
    comment: 'Purpose of visit: house_tax, garbage_collection, or both (for payment collection)'
  },
  citizenResponse: {
    type: DataTypes.ENUM('will_pay_today', 'will_pay_later', 'refused_to_pay', 'not_available'),
    allowNull: false,
    comment: 'Citizen response during visit'
  },
  expectedPaymentDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Expected payment date if citizen promised to pay later'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Mandatory remarks about the visit'
  },
  visitSequenceNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Visit sequence number for this demand (1st, 2nd, 3rd, etc.)'
  },
  // Location information
  visitLatitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    comment: 'GPS latitude at visit time'
  },
  visitLongitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
    comment: 'GPS longitude at visit time'
  },
  visitAddress: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reverse geocoded address at visit time'
  },
  // Device and network information
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: false,
    comment: 'IP address at visit time'
  },
  deviceType: {
    type: DataTypes.ENUM('mobile', 'desktop', 'tablet'),
    allowNull: false,
    defaultValue: 'mobile',
    comment: 'Device type used to record visit'
  },
  browserName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Browser name'
  },
  operatingSystem: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Operating system'
  },
  source: {
    type: DataTypes.ENUM('web', 'mobile'),
    allowNull: false,
    defaultValue: 'mobile',
    comment: 'Source: web or mobile app'
  },
  // Proof and evidence
  proofPhotoUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'URL/path to proof photo if uploaded'
  },
  proofNote: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional proof notes'
  },
  // Attendance linkage
  attendanceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'collector_attendance',
      key: 'id'
    },
    comment: 'Link to attendance record (visit must be within attendance window)'
  },
  isWithinAttendanceWindow: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether visit was made within collector attendance window'
  },
  attendanceWindowNote: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Note if visit was outside attendance window'
  },
  // Status
  status: {
    type: DataTypes.ENUM('recorded', 'verified', 'flagged'),
    defaultValue: 'recorded',
    comment: 'Visit status'
  },
  flaggedReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reason if visit was flagged'
  }
}, {
  tableName: 'field_visits',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: false, // Append-only, cannot be edited
  indexes: [
    {
      unique: true,
      fields: ['visitNumber']
    },
    {
      fields: ['collectorId']
    },
    {
      fields: ['propertyId']
    },
    {
      fields: ['demandId']
    },
    {
      fields: ['visitDate']
    },
    {
      fields: ['collectorId', 'visitDate']
    },
    {
      fields: ['demandId', 'visitSequenceNumber']
    },
    {
      fields: ['attendanceId']
    }
  ],
  hooks: {
    beforeCreate: async (visit) => {
      // Auto-generate visit number if not provided (fallback)
      // Format: FV-YYYY-{sequence}
      if (!visit.visitNumber) {
        const year = new Date().getFullYear();
        const count = await FieldVisit.count({
          where: {
            visitDate: {
              [Op.gte]: new Date(`${year}-01-01`),
              [Op.lt]: new Date(`${year + 1}-01-01`)
            }
          }
        });
        visit.visitNumber = `FV-${year}-${String(count + 1).padStart(6, '0')}`;
      }
    }
  }
});
