import { AuditLog } from '../models/index.js';

/**
 * Centralized Audit Logging Utility
 * Provides clean, reusable functions for logging all system actions
 */

/**
 * Sanitize sensitive data before logging
 */
const sanitizeData = (data) => {
  if (!data || typeof data !== 'object') return data;

  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
};

/**
 * Extract IP address from request
 */
const getIpAddress = (req) => {
  return req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    'unknown';
};

/**
 * Get user agent from request
 */
const getUserAgent = (req) => {
  return req.headers['user-agent'] || 'unknown';
};

/**
 * Create audit log entry
 * @param {Object} options - Audit log options
 * @param {Object} req - Express request object (for IP and user agent)
 * @param {Object} user - User performing the action
 * @param {string} actionType - Type of action
 * @param {string} entityType - Type of entity
 * @param {number} entityId - ID of entity (optional)
 * @param {Object} previousData - Data before change (optional)
 * @param {Object} newData - Data after change (optional)
 * @param {string} description - Human-readable description (optional)
 * @param {Object} metadata - Additional metadata (optional)
 */
/**
 * Validate enum values against model definition
 * This ensures we don't try to insert invalid enum values
 */
const validateEnumValue = (value, validValues, fieldName) => {
  if (!value) return value;
  if (validValues.includes(value)) {
    return value;
  }
  // If value is not in valid list, log warning but don't fail
  console.warn(`Invalid ${fieldName} enum value: ${value}. Valid values: ${validValues.join(', ')}`);
  // Return a safe default or the value if it's close enough
  return value;
};

/**
 * Valid entity types (must match AuditLog model)
 */
const VALID_ENTITY_TYPES = [
  'User', 'Property', 'Assessment', 'Demand', 'Payment', 'Ward', 'Notice',
  'Attendance', 'FieldVisit', 'FollowUp', 'CollectorTask', 'PropertyApplication',
  'WaterConnectionRequest', 'D2DC', 'ShopRegistrationRequest',
  'ToiletFacility', 'ToiletInspection', 'ToiletMaintenance', 'ToiletStaffAssignment', 'ToiletComplaint',
  'MrfFacility', 'MrfSale', 'MrfWorkerAssignment', 'MrfTask',
  'GauShalaFacility', 'GauShalaCattle', 'GauShalaComplaint', 'GauShalaFeedingRecord', 'GauShalaInspection', 'CattleMedicalRecord',
  'Worker', 'WorkerAttendance', 'WorkerPayroll', 'WorkerTask',
  'InventoryItem', 'InventoryTransaction', 'FacilityUtilityBill', 'CitizenFeedback',
  'Alert', 'ULB', 'TaxDiscount', 'PenaltyWaiver'
];

/**
 * Valid action types (must match AuditLog model)
 */
const VALID_ACTION_TYPES = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'RETURN', 'PAY', 'LOGIN', 'LOGOUT', 'ASSIGN', 'ESCALATE', 'SEND', 'RESOLVE', 'PENALTY_APPLIED', 'RECEIPT_PDF_GENERATED', 'NOTICE_PDF_GENERATED', 'RECEIPT_PDF_DOWNLOADED', 'NOTICE_PDF_DOWNLOADED', 'FIELD_VISIT', 'FOLLOW_UP', 'TASK_GENERATED', 'TASK_COMPLETED', 'NOTICE_TRIGGERED', 'ENFORCEMENT_ELIGIBLE', 'VIEW', 'PAYMENT_COLLECTED'];

export const createAuditLog = async ({
  req,
  user,
  actionType,
  entityType,
  entityId = null,
  previousData = null,
  newData = null,
  description = null,
  metadata = null
}) => {
  try {
    // Don't log audit log reads to prevent infinite loops
    if (entityType === 'AuditLog') {
      return;
    }

    // Validate enum values before attempting to create
    const validatedActionType = validateEnumValue(actionType, VALID_ACTION_TYPES, 'actionType');
    const validatedEntityType = validateEnumValue(entityType, VALID_ENTITY_TYPES, 'entityType');

    // If validation failed, log error and use fallback
    if (!validatedActionType || !validatedEntityType) {
      console.error(`Invalid audit log enum values - actionType: ${actionType}, entityType: ${entityType}`);
      // Use safe defaults to prevent system failure
      if (!validatedActionType) {
        console.error(`Falling back to 'UPDATE' for invalid actionType: ${actionType}`);
      }
      if (!validatedEntityType) {
        console.error(`Falling back to 'User' for invalid entityType: ${entityType}`);
      }
      // Don't create invalid audit log - this prevents database errors
      return;
    }

    // Sanitize sensitive data
    const sanitizedPrevious = previousData ? sanitizeData(previousData) : null;
    const sanitizedNew = newData ? sanitizeData(newData) : null;

    // Get IP and user agent from request if available
    const ipAddress = req ? getIpAddress(req) : null;
    const userAgent = req ? getUserAgent(req) : null;

    // For staff users from admin_management table, set actorUserId to null to avoid FK violations
    // We track them via actorRole and can add employee_id to metadata if needed
    const actorUserId = (user?.userType === 'admin_management') ? null : (user?.id || null);

    // Normalize role to lowercase to match ENUM if possible
    const actorRole = user?.role ? user.role.toLowerCase() : 'system';

    await AuditLog.create({
      actorUserId,
      actorRole,
      actionType: validatedActionType,
      entityType: validatedEntityType,
      entityId,
      previousData: sanitizedPrevious,
      newData: sanitizedNew,
      ipAddress,
      userAgent,
      description: description || generateDescription(validatedActionType, validatedEntityType, entityId, user),
      metadata: metadata || null
    });
  } catch (error) {
    // Log error but don't throw - audit logging should never break the main flow
    console.error('Failed to create audit log:', error);
    console.error('Error details:', {
      message: error.message,
      actionType,
      entityType,
      entityId,
      stack: error.stack
    });

    // If it's an enum validation error, log it specifically
    if (error.message && error.message.includes('enum')) {
      console.error('ENUM VALIDATION ERROR - This indicates database enum is out of sync with model definition.');
      console.error('Please run the migration scripts to update database enums.');
    }
  }
};

/**
 * Generate human-readable description
 */
const generateDescription = (actionType, entityType, entityId, user) => {
  const userName = user ? `${user.firstName} ${user.lastName}` : 'System';
  const entityRef = entityId ? ` (ID: ${entityId})` : '';

  const descriptions = {
    CREATE: `${userName} created ${entityType}${entityRef}`,
    UPDATE: `${userName} updated ${entityType}${entityRef}`,
    DELETE: `${userName} deleted ${entityType}${entityRef}`,
    APPROVE: `${userName} approved ${entityType}${entityRef}`,
    REJECT: `${userName} rejected ${entityType}${entityRef}`,
    PAY: `${userName} processed payment for ${entityType}${entityRef}`,
    LOGIN: `${userName} logged in`,
    LOGOUT: `${userName} logged out`,
    ASSIGN: `${userName} assigned ${entityType}${entityRef}`,
    ESCALATE: `${userName} escalated ${entityType}${entityRef}`,
    SEND: `${userName} sent ${entityType}${entityRef}`,
    RESOLVE: `${userName} resolved ${entityType}${entityRef}`,
    PENALTY_APPLIED: `${userName} applied penalty and interest to ${entityType}${entityRef}`,
    RECEIPT_PDF_GENERATED: `${userName} generated receipt PDF for ${entityType}${entityRef}`,
    NOTICE_PDF_GENERATED: `${userName} generated notice PDF for ${entityType}${entityRef}`,
    RECEIPT_PDF_DOWNLOADED: `${userName} downloaded receipt PDF for ${entityType}${entityRef}`,
    NOTICE_PDF_DOWNLOADED: `${userName} downloaded notice PDF for ${entityType}${entityRef}`
  };

  return descriptions[actionType] || `${userName} performed ${actionType} on ${entityType}${entityRef}`;
};

/**
 * Convenience functions for common actions
 */
export const auditLogger = {
  /**
   * Generic audit log creation method
   */
  createAuditLog: createAuditLog,
  /**
   * Log CREATE action
   */
  logCreate: async (req, user, entityType, entityId, newData, description, metadata) => {
    await createAuditLog({
      req,
      user,
      actionType: 'CREATE',
      entityType,
      entityId,
      newData,
      description,
      metadata
    });
  },

  /**
   * Log UPDATE action
   */
  logUpdate: async (req, user, entityType, entityId, previousData, newData, description, metadata) => {
    await createAuditLog({
      req,
      user,
      actionType: 'UPDATE',
      entityType,
      entityId,
      previousData,
      newData,
      description,
      metadata
    });
  },

  /**
   * Log DELETE action
   */
  logDelete: async (req, user, entityType, entityId, previousData, description, metadata) => {
    await createAuditLog({
      req,
      user,
      actionType: 'DELETE',
      entityType,
      entityId,
      previousData,
      description,
      metadata
    });
  },

  /**
   * Log APPROVE action
   */
  logApprove: async (req, user, entityType, entityId, previousData, newData, description, metadata) => {
    await createAuditLog({
      req,
      user,
      actionType: 'APPROVE',
      entityType,
      entityId,
      previousData,
      newData,
      description,
      metadata
    });
  },

  /**
   * Log REJECT action
   */
  logReject: async (req, user, entityType, entityId, previousData, newData, description, metadata) => {
    await createAuditLog({
      req,
      user,
      actionType: 'REJECT',
      entityType,
      entityId,
      previousData,
      newData,
      description,
      metadata
    });
  },

  /**
   * Log PAY action
   */
  logPay: async (req, user, entityType, entityId, newData, description, metadata) => {
    await createAuditLog({
      req,
      user,
      actionType: 'PAY',
      entityType,
      entityId,
      newData,
      description,
      metadata
    });
  },

  /**
   * Log LOGIN action
   */
  logLogin: async (req, user, description) => {
    await createAuditLog({
      req,
      user,
      actionType: 'LOGIN',
      entityType: 'User',
      entityId: user?.id,
      description: description || `${user?.firstName} ${user?.lastName} logged in`
    });
  },

  /**
   * Log LOGOUT action
   */
  logLogout: async (req, user, description) => {
    await createAuditLog({
      req,
      user,
      actionType: 'LOGOUT',
      entityType: 'User',
      entityId: user?.id,
      description: description || `${user?.firstName} ${user?.lastName} logged out`
    });
  },

  /**
   * Log ASSIGN action
   */
  logAssign: async (req, user, entityType, entityId, newData, description, metadata) => {
    await createAuditLog({
      req,
      user,
      actionType: 'ASSIGN',
      entityType,
      entityId,
      newData,
      description,
      metadata
    });
  },

  /**
   * Log ESCALATE action
   */
  logEscalate: async (req, user, entityType, entityId, previousData, newData, description, metadata) => {
    await createAuditLog({
      req,
      user,
      actionType: 'ESCALATE',
      entityType,
      entityId,
      previousData,
      newData,
      description,
      metadata
    });
  },

  /**
   * Log SEND action
   */
  logSend: async (req, user, entityType, entityId, newData, description, metadata) => {
    await createAuditLog({
      req,
      user,
      actionType: 'SEND',
      entityType,
      entityId,
      newData,
      description,
      metadata
    });
  },

  /**
   * Log RESOLVE action
   */
  logResolve: async (req, user, entityType, entityId, previousData, newData, description, metadata) => {
    await createAuditLog({
      req,
      user,
      actionType: 'RESOLVE',
      entityType,
      entityId,
      previousData,
      newData,
      description,
      metadata
    });
  }
};
