import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Notice = sequelize.define('Notice', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  noticeNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Auto-generated unique notice number'
  },
  noticeType: {
    type: DataTypes.ENUM('reminder', 'demand', 'penalty', 'final_warrant'),
    allowNull: false,
    comment: 'Type of notice: reminder, demand, penalty, final_warrant'
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Properties',
      key: 'id'
    }
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
    }
  },
  financialYear: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: 'Format: 2024-25'
  },
  noticeDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Due date for payment'
  },
  amountDue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Total amount due'
  },
  penaltyAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Penalty amount if applicable'
  },
  status: {
    type: DataTypes.ENUM('generated', 'sent', 'viewed', 'resolved', 'escalated'),
    defaultValue: 'generated',
    comment: 'Notice status lifecycle'
  },
  deliveryMode: {
    type: DataTypes.ENUM('print', 'email', 'sms'),
    allowNull: true,
    comment: 'How notice was delivered'
  },
  generatedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'Admin/Assessor who generated the notice'
  },
  previousNoticeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Notices',
      key: 'id'
    },
    comment: 'Reference to previous notice if escalated'
  },
  sentDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date when notice was sent'
  },
  viewedDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date when citizen viewed the notice'
  },
  resolvedDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date when notice was resolved (payment made)'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional remarks or notes'
  },
  pdfUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Path/URL to generated notice PDF'
  },
  pdfGeneratedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when notice PDF was generated'
  }
}, {
  tableName: 'notices',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['noticeNumber']
    },
    {
      fields: ['propertyId']
    },
    {
      fields: ['ownerId']
    },
    {
      fields: ['demandId']
    },
    {
      fields: ['noticeType']
    },
    {
      fields: ['status']
    },
    {
      fields: ['financialYear']
    }
  ]
});
