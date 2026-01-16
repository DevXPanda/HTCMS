import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const FollowUp = sequelize.define('FollowUp', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  demandId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'Demands',
      key: 'id'
    },
    comment: 'One follow-up record per demand'
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
    }
  },
  visitCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Total number of visits made for this demand'
  },
  lastVisitDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date of last visit'
  },
  lastVisitId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'field_visits',
      key: 'id'
    },
    comment: 'Reference to last field visit'
  },
  lastVisitType: {
    type: DataTypes.ENUM('reminder', 'payment_collection', 'warning', 'final_warning'),
    allowNull: true,
    comment: 'Type of last visit'
  },
  lastCitizenResponse: {
    type: DataTypes.ENUM('will_pay_today', 'will_pay_later', 'refused_to_pay', 'not_available'),
    allowNull: true,
    comment: 'Last citizen response'
  },
  expectedPaymentDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Expected payment date from last visit'
  },
  escalationLevel: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Current escalation level: 0=none, 1=1st visit, 2=2nd visit, 3=3rd visit, 4=enforcement eligible'
  },
  escalationStatus: {
    type: DataTypes.ENUM('none', 'first_reminder', 'second_reminder', 'final_warning', 'enforcement_eligible'),
    defaultValue: 'none',
    comment: 'Current escalation status'
  },
  isEnforcementEligible: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether demand is eligible for enforcement notice (after 3 failed visits)'
  },
  enforcementEligibleDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date when demand became eligible for enforcement'
  },
  noticeTriggered: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether enforcement notice has been triggered'
  },
  noticeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'notices',
      key: 'id'
    },
    comment: 'Reference to triggered notice if any'
  },
  isResolved: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether follow-up is resolved (payment made)'
  },
  resolvedDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date when follow-up was resolved'
  },
  resolvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'User who resolved (collector if field payment, citizen if online)'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium',
    comment: 'Current priority level based on visits and overdue days'
  },
  nextFollowUpDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Recommended next follow-up date'
  },
  lastUpdatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'Last user who updated this follow-up'
  }
}, {
  tableName: 'follow_ups',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['demandId']
    },
    {
      fields: ['propertyId']
    },
    {
      fields: ['ownerId']
    },
    {
      fields: ['escalationStatus']
    },
    {
      fields: ['isEnforcementEligible']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['nextFollowUpDate']
    },
    {
      fields: ['isResolved']
    }
  ]
});
