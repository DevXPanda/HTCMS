import { User } from './User.js';
import { Property } from './Property.js';
import { Ward } from './Ward.js';
import { Assessment } from './Assessment.js';
import { Demand } from './Demand.js';
import { Payment } from './Payment.js';
import { Notice } from './Notice.js';
import { AuditLog } from './AuditLog.js';
import { PenaltyRule } from './PenaltyRule.js';
import { CollectorAttendance } from './CollectorAttendance.js';
import { FieldVisit } from './FieldVisit.js';
import { FollowUp } from './FollowUp.js';
import { CollectorTask } from './CollectorTask.js';
import { WaterConnection } from './WaterConnection.js';
import { WaterMeterReading } from './WaterMeterReading.js';
import { WaterBill } from './WaterBill.js';
import { WaterPayment } from './WaterPayment.js';
import { WaterTaxAssessment } from './WaterTaxAssessment.js';
import { WaterConnectionDocument } from './WaterConnectionDocument.js';
import { DemandItem } from './DemandItem.js';
import { WaterConnectionRequest } from './WaterConnectionRequest.js';
import { PropertyApplication } from './PropertyApplication.js';
import { AdminManagement } from './AdminManagement.js';
import { D2DCRecord } from './D2DCRecord.js';

// Define Relationships

// User Relationships
User.hasMany(Property, { foreignKey: 'ownerId', as: 'properties' });
User.hasMany(Property, { foreignKey: 'createdBy', as: 'createdProperties' });
User.hasMany(Assessment, { foreignKey: 'assessorId', as: 'assessments' });
User.hasMany(Assessment, { foreignKey: 'approvedBy', as: 'approvedAssessments' });
User.hasMany(Demand, { foreignKey: 'generatedBy', as: 'generatedDemands' });
User.hasMany(Payment, { foreignKey: 'receivedBy', as: 'receivedPayments' });
User.hasMany(Payment, { foreignKey: 'collectedBy', as: 'collectedPayments' });
User.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// AdminManagement Relationships
AdminManagement.hasMany(Ward, { foreignKey: 'collectorId', as: 'assignedWards' });

// Property Relationships
Property.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
Property.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Property.belongsTo(Ward, { foreignKey: 'wardId', as: 'ward' });
Property.hasMany(Assessment, { foreignKey: 'propertyId', as: 'assessments' });
Property.hasMany(Demand, { foreignKey: 'propertyId', as: 'demands' });
Property.hasMany(Payment, { foreignKey: 'propertyId', as: 'payments' });
Property.hasMany(WaterConnection, { foreignKey: 'propertyId', as: 'waterConnections' });

// Ward Relationships
Ward.belongsTo(AdminManagement, { foreignKey: 'collectorId', as: 'collector' });
Ward.belongsTo(AdminManagement, { foreignKey: 'clerkId', as: 'clerk' });
Ward.belongsTo(AdminManagement, { foreignKey: 'inspectorId', as: 'inspector' });
Ward.belongsTo(AdminManagement, { foreignKey: 'officerId', as: 'officer' });
Ward.hasMany(Property, { foreignKey: 'wardId', as: 'properties' });

// Assessment Relationships
Assessment.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
Assessment.belongsTo(User, { foreignKey: 'assessorId', as: 'assessor' });
Assessment.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });
Assessment.hasMany(Demand, { foreignKey: 'assessmentId', as: 'demands' });

// Demand Relationships
Demand.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
Demand.belongsTo(Assessment, { foreignKey: 'assessmentId', as: 'assessment' });
Demand.belongsTo(WaterTaxAssessment, { foreignKey: 'waterTaxAssessmentId', as: 'waterTaxAssessment' });
Demand.belongsTo(User, { foreignKey: 'generatedBy', as: 'generator' });
Demand.hasMany(Payment, { foreignKey: 'demandId', as: 'payments' });
Demand.hasMany(DemandItem, { foreignKey: 'demandId', as: 'items' });

// Payment Relationships
Payment.belongsTo(Demand, { foreignKey: 'demandId', as: 'demand' });
Payment.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
Payment.belongsTo(User, { foreignKey: 'receivedBy', as: 'cashier' });
Payment.belongsTo(User, { foreignKey: 'collectedBy', as: 'collector' });
Payment.belongsTo(AdminManagement, { foreignKey: 'receivedBy', as: 'cashierStaff' });
Payment.belongsTo(AdminManagement, { foreignKey: 'collectedBy', as: 'collectorStaff' });

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

// CollectorAttendance Relationships
CollectorAttendance.belongsTo(User, { foreignKey: 'collectorId', as: 'collector' });
User.hasMany(CollectorAttendance, { foreignKey: 'collectorId', as: 'attendanceRecords' });

// FieldVisit Relationships
FieldVisit.belongsTo(User, { foreignKey: 'collectorId', as: 'collector' });
FieldVisit.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
FieldVisit.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
FieldVisit.belongsTo(Demand, { foreignKey: 'demandId', as: 'demand' });
FieldVisit.belongsTo(CollectorAttendance, { foreignKey: 'attendanceId', as: 'attendance' });
User.hasMany(FieldVisit, { foreignKey: 'collectorId', as: 'fieldVisits' });
Property.hasMany(FieldVisit, { foreignKey: 'propertyId', as: 'fieldVisits' });
Demand.hasMany(FieldVisit, { foreignKey: 'demandId', as: 'fieldVisits' });
CollectorAttendance.hasMany(FieldVisit, { foreignKey: 'attendanceId', as: 'fieldVisits' });

// FollowUp Relationships
FollowUp.belongsTo(Demand, { foreignKey: 'demandId', as: 'demand' });
FollowUp.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
FollowUp.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
FollowUp.belongsTo(FieldVisit, { foreignKey: 'lastVisitId', as: 'lastVisit' });
FollowUp.belongsTo(Notice, { foreignKey: 'noticeId', as: 'notice' });
FollowUp.belongsTo(User, { foreignKey: 'resolvedBy', as: 'resolver' });
FollowUp.belongsTo(User, { foreignKey: 'lastUpdatedBy', as: 'lastUpdater' });
Demand.hasOne(FollowUp, { foreignKey: 'demandId', as: 'followUp' });
Property.hasMany(FollowUp, { foreignKey: 'propertyId', as: 'followUps' });
User.hasMany(FollowUp, { foreignKey: 'ownerId', as: 'followUps' });

// CollectorTask Relationships
CollectorTask.belongsTo(User, { foreignKey: 'collectorId', as: 'collector' });
CollectorTask.belongsTo(Demand, { foreignKey: 'demandId', as: 'demand' });
CollectorTask.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
CollectorTask.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
CollectorTask.belongsTo(FollowUp, { foreignKey: 'followUpId', as: 'followUp' });
CollectorTask.belongsTo(User, { foreignKey: 'completedBy', as: 'completer' });
CollectorTask.belongsTo(FieldVisit, { foreignKey: 'relatedVisitId', as: 'relatedVisit' });
User.hasMany(CollectorTask, { foreignKey: 'collectorId', as: 'tasks' });
Demand.hasMany(CollectorTask, { foreignKey: 'demandId', as: 'tasks' });
Property.hasMany(CollectorTask, { foreignKey: 'propertyId', as: 'tasks' });
FollowUp.hasMany(CollectorTask, { foreignKey: 'followUpId', as: 'tasks' });

// Notice Relationships (additional for collector-triggered)
Notice.belongsTo(FollowUp, { foreignKey: 'followUpId', as: 'followUp' });
FollowUp.hasMany(Notice, { foreignKey: 'followUpId', as: 'notices' });

// Water Tax Module Relationships

// WaterConnection Relationships
WaterConnection.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
WaterConnection.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
WaterConnection.hasMany(WaterMeterReading, { foreignKey: 'waterConnectionId', as: 'meterReadings' });
WaterConnection.hasMany(WaterBill, { foreignKey: 'waterConnectionId', as: 'bills' });
WaterConnection.hasMany(WaterPayment, { foreignKey: 'waterConnectionId', as: 'payments' });
WaterConnection.hasMany(WaterConnectionDocument, { foreignKey: 'waterConnectionId', as: 'documents' });

// User Relationships (additional for water tax)
User.hasMany(WaterConnection, { foreignKey: 'createdBy', as: 'createdWaterConnections' });
User.hasMany(WaterMeterReading, { foreignKey: 'readerId', as: 'meterReadings' });
User.hasMany(WaterBill, { foreignKey: 'generatedBy', as: 'generatedWaterBills' });
User.hasMany(WaterPayment, { foreignKey: 'receivedBy', as: 'receivedWaterPayments' });
User.hasMany(WaterConnectionDocument, { foreignKey: 'uploadedBy', as: 'uploadedWaterConnectionDocuments' });

// WaterMeterReading Relationships
WaterMeterReading.belongsTo(WaterConnection, { foreignKey: 'waterConnectionId', as: 'waterConnection' });
WaterMeterReading.belongsTo(User, { foreignKey: 'readerId', as: 'reader' });
WaterMeterReading.hasMany(WaterBill, { foreignKey: 'meterReadingId', as: 'bills' });

// WaterBill Relationships
WaterBill.belongsTo(WaterConnection, { foreignKey: 'waterConnectionId', as: 'waterConnection' });
WaterBill.belongsTo(WaterMeterReading, { foreignKey: 'meterReadingId', as: 'meterReading' });
WaterBill.belongsTo(User, { foreignKey: 'generatedBy', as: 'generator' });
WaterBill.hasMany(WaterPayment, { foreignKey: 'waterBillId', as: 'payments' });

// WaterPayment Relationships
WaterPayment.belongsTo(WaterBill, { foreignKey: 'waterBillId', as: 'waterBill' });
WaterPayment.belongsTo(WaterConnection, { foreignKey: 'waterConnectionId', as: 'waterConnection' });
WaterPayment.belongsTo(User, { foreignKey: 'receivedBy', as: 'cashier' });

// WaterConnectionDocument Relationships
WaterConnectionDocument.belongsTo(WaterConnection, { foreignKey: 'waterConnectionId', as: 'waterConnection' });
WaterConnectionDocument.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });
WaterConnectionDocument.belongsTo(WaterConnectionRequest, { foreignKey: 'waterConnectionRequestId', as: 'waterConnectionRequest' });

// WaterTaxAssessment Relationships
WaterTaxAssessment.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
WaterTaxAssessment.belongsTo(WaterConnection, { foreignKey: 'waterConnectionId', as: 'waterConnection' });
WaterTaxAssessment.belongsTo(User, { foreignKey: 'assessorId', as: 'assessor' });
WaterTaxAssessment.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

// Property Relationships (additional for water tax assessments)
Property.hasMany(WaterTaxAssessment, { foreignKey: 'propertyId', as: 'waterTaxAssessments' });

// WaterConnection Relationships (additional for water tax assessments)
WaterConnection.hasMany(WaterTaxAssessment, { foreignKey: 'waterConnectionId', as: 'assessments' });

// User Relationships (additional for water tax assessments)
User.hasMany(WaterTaxAssessment, { foreignKey: 'assessorId', as: 'waterTaxAssessments' });
User.hasMany(WaterTaxAssessment, { foreignKey: 'approvedBy', as: 'approvedWaterTaxAssessments' });

// DemandItem Relationships
DemandItem.belongsTo(Demand, { foreignKey: 'demandId', as: 'demand' });
DemandItem.belongsTo(WaterConnection, { foreignKey: 'connectionId', as: 'waterConnection' });

// WaterConnectionRequest Relationships
WaterConnectionRequest.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
WaterConnectionRequest.belongsTo(User, { foreignKey: 'requestedBy', as: 'requester' });
WaterConnectionRequest.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
WaterConnectionRequest.belongsTo(User, { foreignKey: 'inspectedBy', as: 'inspector' });
WaterConnectionRequest.belongsTo(User, { foreignKey: 'processedBy', as: 'processor' });
WaterConnectionRequest.belongsTo(AdminManagement, { foreignKey: 'escalatedBy', as: 'escalatedByInspector' });
WaterConnectionRequest.belongsTo(User, { foreignKey: 'decidedby', as: 'decidedByOfficer' });
WaterConnectionRequest.belongsTo(WaterConnection, { foreignKey: 'waterConnectionId', as: 'waterConnection' });
WaterConnectionRequest.hasMany(WaterConnectionDocument, { foreignKey: 'waterConnectionRequestId', as: 'documents' });

// Property Relationships (additional for water connection requests)
Property.hasMany(WaterConnectionRequest, { foreignKey: 'propertyId', as: 'waterConnectionRequests' });

// User Relationships (additional for water connection requests)
User.hasMany(WaterConnectionRequest, { foreignKey: 'requestedBy', as: 'waterConnectionRequests' });
User.hasMany(WaterConnectionRequest, { foreignKey: 'createdBy', as: 'createdWaterConnectionRequests' });
User.hasMany(WaterConnectionRequest, { foreignKey: 'inspectedBy', as: 'inspectedWaterConnectionRequests' });
User.hasMany(WaterConnectionRequest, { foreignKey: 'processedBy', as: 'processedWaterConnectionRequests' });
User.hasMany(WaterConnectionRequest, { foreignKey: 'escalatedBy', as: 'escalatedWaterConnectionRequests' });
User.hasMany(WaterConnectionRequest, { foreignKey: 'decidedby', as: 'officerDecidedWaterConnectionRequests' });

// WaterConnection Relationships (additional for requests)
WaterConnection.hasOne(WaterConnectionRequest, { foreignKey: 'waterConnectionId', as: 'request' });

// PropertyApplication Relationships
PropertyApplication.belongsTo(User, { foreignKey: 'applicantId', as: 'applicant' });
PropertyApplication.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
PropertyApplication.belongsTo(Ward, { foreignKey: 'wardId', as: 'ward' });
PropertyApplication.belongsTo(User, { foreignKey: 'inspectedBy', as: 'inspector' });
PropertyApplication.belongsTo(User, { foreignKey: 'escalatedBy', as: 'escalatedByInspector' });
PropertyApplication.belongsTo(User, { foreignKey: 'decidedby', as: 'decidedByOfficer' });
PropertyApplication.belongsTo(Property, { foreignKey: 'approvedPropertyId', as: 'approvedProperty' });

// User Relationships (additional for property applications)
User.hasMany(PropertyApplication, { foreignKey: 'applicantId', as: 'propertyApplications' });
User.hasMany(PropertyApplication, { foreignKey: 'createdBy', as: 'createdPropertyApplications' });
User.hasMany(PropertyApplication, { foreignKey: 'inspectedBy', as: 'inspectedPropertyApplications' });
User.hasMany(PropertyApplication, { foreignKey: 'escalatedBy', as: 'escalatedPropertyApplications' });
User.hasMany(PropertyApplication, { foreignKey: 'decidedby', as: 'officerDecidedPropertyApplications' });

// Ward Relationships (additional for property applications)
Ward.hasMany(PropertyApplication, { foreignKey: 'wardId', as: 'propertyApplications' });

// Property Relationships (additional for property applications)
Property.hasOne(PropertyApplication, { foreignKey: 'approvedPropertyId', as: 'propertyApplication' });

// AdminManagement Relationships
AdminManagement.belongsTo(User, { foreignKey: 'created_by_admin_id', as: 'creator' });
User.hasMany(AdminManagement, { foreignKey: 'created_by_admin_id', as: 'createdEmployees' });

// D2DCRecord Relationships
D2DCRecord.belongsTo(User, { foreignKey: 'collectorId', as: 'collector' });
D2DCRecord.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
D2DCRecord.belongsTo(Ward, { foreignKey: 'wardId', as: 'ward' });
D2DCRecord.belongsTo(Demand, { foreignKey: 'demandId', as: 'demand' });
D2DCRecord.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });

User.hasMany(D2DCRecord, { foreignKey: 'collectorId', as: 'd2dcActivities' });
Property.hasMany(D2DCRecord, { foreignKey: 'propertyId', as: 'd2dcRecords' });
Ward.hasMany(D2DCRecord, { foreignKey: 'wardId', as: 'd2dcRecords' });

export {
  User,
  Property,
  Ward,
  Assessment,
  Demand,
  DemandItem,
  Payment,
  Notice,
  AuditLog,
  PenaltyRule,
  CollectorAttendance,
  FieldVisit,
  FollowUp,
  CollectorTask,
  WaterConnection,
  WaterMeterReading,
  WaterBill,
  WaterPayment,
  WaterTaxAssessment,
  WaterConnectionDocument,
  WaterConnectionRequest,
  PropertyApplication,
  AdminManagement,
  D2DCRecord
};
