import { User } from './User.js';
import { Property } from './Property.js';
import { Ward } from './Ward.js';
import { Assessment } from './Assessment.js';
import { Demand } from './Demand.js';
import { Payment } from './Payment.js';
import { Notice } from './Notice.js';
import { AuditLog } from './AuditLog.js';
import { PenaltyRule } from './PenaltyRule.js';

// Define Relationships

// User Relationships
User.hasMany(Property, { foreignKey: 'ownerId', as: 'properties' });
User.hasMany(Property, { foreignKey: 'createdBy', as: 'createdProperties' });
User.hasMany(Assessment, { foreignKey: 'assessorId', as: 'assessments' });
User.hasMany(Assessment, { foreignKey: 'approvedBy', as: 'approvedAssessments' });
User.hasMany(Demand, { foreignKey: 'generatedBy', as: 'generatedDemands' });
User.hasMany(Payment, { foreignKey: 'receivedBy', as: 'receivedPayments' });
User.hasMany(Ward, { foreignKey: 'collectorId', as: 'assignedWards' });
User.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// Property Relationships
Property.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
Property.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Property.belongsTo(Ward, { foreignKey: 'wardId', as: 'ward' });
Property.hasMany(Assessment, { foreignKey: 'propertyId', as: 'assessments' });
Property.hasMany(Demand, { foreignKey: 'propertyId', as: 'demands' });
Property.hasMany(Payment, { foreignKey: 'propertyId', as: 'payments' });

// Ward Relationships
Ward.belongsTo(User, { foreignKey: 'collectorId', as: 'collector' });
Ward.hasMany(Property, { foreignKey: 'wardId', as: 'properties' });

// Assessment Relationships
Assessment.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
Assessment.belongsTo(User, { foreignKey: 'assessorId', as: 'assessor' });
Assessment.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });
Assessment.hasMany(Demand, { foreignKey: 'assessmentId', as: 'demands' });

// Demand Relationships
Demand.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
Demand.belongsTo(Assessment, { foreignKey: 'assessmentId', as: 'assessment' });
Demand.belongsTo(User, { foreignKey: 'generatedBy', as: 'generator' });
Demand.hasMany(Payment, { foreignKey: 'demandId', as: 'payments' });

// Payment Relationships
Payment.belongsTo(Demand, { foreignKey: 'demandId', as: 'demand' });
Payment.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
Payment.belongsTo(User, { foreignKey: 'receivedBy', as: 'cashier' });

// Notice Relationships
Notice.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
Notice.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
Notice.belongsTo(Demand, { foreignKey: 'demandId', as: 'demand' });
Notice.belongsTo(User, { foreignKey: 'generatedBy', as: 'generator' });
Notice.belongsTo(Notice, { foreignKey: 'previousNoticeId', as: 'previousNotice' });
Notice.hasMany(Notice, { foreignKey: 'previousNoticeId', as: 'escalatedNotices' });

// User Relationships (additional for notices)
User.hasMany(Notice, { foreignKey: 'ownerId', as: 'notices' });
User.hasMany(Notice, { foreignKey: 'generatedBy', as: 'generatedNotices' });

// Property Relationships (additional for notices)
Property.hasMany(Notice, { foreignKey: 'propertyId', as: 'notices' });

// Demand Relationships (additional for notices)
Demand.hasMany(Notice, { foreignKey: 'demandId', as: 'notices' });

// AuditLog Relationships
AuditLog.belongsTo(User, { foreignKey: 'actorUserId', as: 'actor' });

// User Relationships (additional for audit logs)
User.hasMany(AuditLog, { foreignKey: 'actorUserId', as: 'auditLogs' });

// PenaltyRule Relationships
PenaltyRule.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
User.hasMany(PenaltyRule, { foreignKey: 'createdBy', as: 'createdPenaltyRules' });

export {
  User,
  Property,
  Ward,
  Assessment,
  Demand,
  Payment,
  Notice,
  AuditLog,
  PenaltyRule
};
