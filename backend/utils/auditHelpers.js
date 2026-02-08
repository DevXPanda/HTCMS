/**
 * Utility functions for audit logging with safe enum handling
 */

// Valid audit action types from the database enum
const VALID_AUDIT_ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'VIEW',
  'EXPORT',
  'IMPORT',
  'APPROVE',
  'REJECT',
  'PAY',
  'COLLECT',
  'GENERATE',
  'SEND',
  'RECEIVE',
  'UPLOAD',
  'DOWNLOAD',
  'ASSIGN',
  'UNASSIGN',
  'RESOLVE',
  'CLOSE',
  'OPEN',
  'ARCHIVE',
  'RESTORE'
];

// Mapping for custom action types to valid enum values
const ACTION_TYPE_MAPPING = {
  'PAYMENT_DISTRIBUTION': 'PAY',
  'FIELD_COLLECTION': 'COLLECT',
  'PAYMENT_PROCESSING': 'PAY',
  'RECEIPT_GENERATION': 'GENERATE',
  'DEMAND_GENERATION': 'GENERATE',
  'ASSESSMENT_APPROVAL': 'APPROVE',
  'ASSESSMENT_REJECTION': 'REJECT',
  'FOLLOW_UP_RESOLUTION': 'RESOLVE',
  'FOLLOW_UP_CLOSURE': 'CLOSE',
  'DOCUMENT_UPLOAD': 'UPLOAD',
  'DOCUMENT_DOWNLOAD': 'DOWNLOAD',
  'WARD_ASSIGNMENT': 'ASSIGN',
  'WARD_UNASSIGNMENT': 'UNASSIGN',
  'NOTICE_GENERATION': 'GENERATE',
  'NOTICE_SENDING': 'SEND',
  'REPORT_GENERATION': 'GENERATE',
  'REPORT_EXPORT': 'EXPORT',
  'USER_LOGIN': 'LOGIN',
  'USER_LOGOUT': 'LOGOUT',
  'DATA_EXPORT': 'EXPORT',
  'DATA_IMPORT': 'IMPORT',
  'APPLICATION_CREATED': 'CREATE',
  'APPLICATION_SUBMITTED': 'SEND',
  'APPLICATION_FORWARDED': 'SEND',
  'APPLICATION_APPROVED': 'APPROVE',
  'APPLICATION_REJECTED': 'REJECT',
  'APPLICATION_RETURNED': 'SEND',
  'APPLICATION_UPDATED': 'UPDATE',
  'PAYMENT_COLLECTED': 'COLLECT'
};

/**
 * Safely maps action type to valid enum value
 * @param {string} actionType - The action type to validate/map
 * @returns {string} - Valid action type enum value
 */
export const validateAuditAction = (actionType) => {
  if (!actionType) {
    return 'VIEW'; // Default fallback
  }

  // If it's already a valid enum, return as-is
  if (VALID_AUDIT_ACTIONS.includes(actionType)) {
    return actionType;
  }

  // Try to map custom action types to valid ones
  const mappedAction = ACTION_TYPE_MAPPING[actionType];
  if (mappedAction) {
    return mappedAction;
  }

  // If no mapping found, try to find a close match or use default
  const upperAction = actionType.toUpperCase();

  // Check for partial matches
  if (upperAction.includes('PAY') || upperAction.includes('COLLECT')) {
    return 'PAY';
  }
  if (upperAction.includes('CREATE') || upperAction.includes('GENERATE')) {
    return 'CREATE';
  }
  if (upperAction.includes('UPDATE') || upperAction.includes('MODIFY')) {
    return 'UPDATE';
  }
  if (upperAction.includes('DELETE') || upperAction.includes('REMOVE')) {
    return 'DELETE';
  }
  if (upperAction.includes('VIEW') || upperAction.includes('READ') || upperAction.includes('GET')) {
    return 'VIEW';
  }
  if (upperAction.includes('APPROVE')) {
    return 'APPROVE';
  }
  if (upperAction.includes('REJECT')) {
    return 'REJECT';
  }
  if (upperAction.includes('RESOLVE') || upperAction.includes('CLOSE')) {
    return 'RESOLVE';
  }
  if (upperAction.includes('UPLOAD')) {
    return 'UPLOAD';
  }
  if (upperAction.includes('DOWNLOAD') || upperAction.includes('EXPORT')) {
    return 'DOWNLOAD';
  }
  if (upperAction.includes('ASSIGN')) {
    return 'ASSIGN';
  }

  // Default fallback
  return 'VIEW';
};

/**
 * Creates audit log data with safe action type validation
 * @param {Object} auditData - Audit log data
 * @param {string} auditData.actionType - The action type to validate
 * @param {Object} auditData.req - Express request object
 * @param {Object} auditData.user - User object
 * @param {string} auditData.entityType - Entity type
 * @param {number} auditData.entityId - Entity ID
 * @param {string} auditData.description - Description
 * @param {Object} auditData.metadata - Additional metadata
 * @returns {Object} - Sanitized audit log data
 */
export const createSafeAuditLog = (auditData) => {
  const {
    actionType,
    req,
    user,
    entityType,
    entityId,
    description,
    metadata
  } = auditData;

  return {
    actionType: validateAuditAction(actionType),
    req,
    user,
    entityType,
    entityId,
    description,
    metadata: {
      ...metadata,
      originalActionType: actionType, // Keep original for debugging
      actionTypeMapped: actionType !== validateAuditAction(actionType)
    }
  };
};
