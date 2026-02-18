import express from 'express';
import {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getAvailableWards,
  getAllULBs,
  resetEmployeePassword,
  getEmployeeStatistics,
  bulkDeleteEmployees,
  bulkUpdateEmployeeStatus,
  getEmployeesByUlb
} from '../controllers/adminManagement.controller.js';
import { requireAdmin, authenticate } from '../middleware/enhancedAuth.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Validation rules
const createEmployeeValidation = [
  body('full_name')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  
  body('role')
    .custom((value) => {
      const normalizedValue = value ? value.toUpperCase().replace(/-/g, '_') : value;
      const allowedRoles = ['CLERK', 'INSPECTOR', 'OFFICER', 'COLLECTOR', 'EO', 'SUPERVISOR', 'FIELD_WORKER', 'CONTRACTOR', 'ADMIN'];
      if (!allowedRoles.includes(normalizedValue)) {
        throw new Error(`Role must be one of: ${allowedRoles.join(', ')}`);
      }
      return true;
    })
    .customSanitizer((value) => {
      // Normalize role to uppercase with underscores
      return value ? value.toUpperCase().replace(/-/g, '_') : value;
    }),
  
  body('phone_number')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ min: 6, max: 15 })
    .withMessage('Phone number must be between 6 and 15 digits')
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('Phone number can only contain digits, +, -, spaces, and parentheses'),
  
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('ward_ids')
    .custom((value, { req }) => {
      const role = req.body.role;
      if (role === 'clerk') {
        if (!Array.isArray(value) || value.length !== 1) {
          throw new Error('Clerk must be assigned exactly one ward');
        }
        if (!Number.isInteger(value[0]) || value[0] <= 0) {
          throw new Error('Ward ID must be a positive integer');
        }
      } else if (role === 'eo') {
        if (!Array.isArray(value) || value.length === 0) {
          throw new Error('EO must be assigned at least one ward');
        }
        if (!value.every(id => Number.isInteger(id) && id > 0)) {
          throw new Error('All ward IDs must be positive integers');
        }
      } else if (value !== undefined) {
        if (!Array.isArray(value)) {
          throw new Error('Ward IDs must be an array');
        }
        if (value.length > 0 && !value.every(id => Number.isInteger(id) && id > 0)) {
          throw new Error('All ward IDs must be positive integers');
        }
      }
      return true;
    }),
  body('assigned_ulb').optional().trim(),
  body('ulb_id').optional().isUUID().withMessage('ULB ID must be a valid UUID'),
  body('ward_id').optional().isInt({ min: 1 }).withMessage('Ward ID must be a positive integer'),
  body('eo_id').optional().isInt({ min: 1 }).withMessage('EO ID must be a positive integer'),
  body('supervisor_id').optional().isInt({ min: 1 }).withMessage('Supervisor ID must be a positive integer'),
  body('contractor_id').optional().isInt({ min: 1 }).withMessage('Contractor ID must be a positive integer'),
  body('worker_type').optional().isIn(['ULB', 'CONTRACTUAL']).withMessage('Worker type must be ULB or CONTRACTUAL'),
  body('company_name').optional().trim(),
  body('contact_details').optional().trim(),
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be either active or inactive')
];

const validateRoleBasedFields = (req, res, next) => {
  // Normalize role to uppercase for comparison
  const role = req.body.role ? req.body.role.toUpperCase().replace(/-/g, '_') : req.body.role;
  const errors = [];
  if (role === 'EO') {
    // Check for ulb_id (UUID) instead of assigned_ulb (name)
    if (!req.body.ulb_id || String(req.body.ulb_id).trim() === '') {
      errors.push({ msg: 'ULB ID is required for EO' });
    }
    if (!Array.isArray(req.body.ward_ids) || req.body.ward_ids.length === 0) {
      errors.push({ msg: 'At least one ward is required for EO' });
    }
  } else if (role === 'SUPERVISOR') {
    if (!req.body.ward_id) errors.push({ msg: 'Ward is required for Supervisor' });
    if (!req.body.eo_id) errors.push({ msg: 'EO is required for Supervisor' });
  } else if (role === 'FIELD_WORKER') {
    if (!req.body.worker_type || !['ULB', 'CONTRACTUAL'].includes(req.body.worker_type)) errors.push({ msg: 'Worker Type (ULB or CONTRACTUAL) is required for Field Worker' });
    if (!req.body.ward_id) errors.push({ msg: 'Ward is required for Field Worker' });
    if (!req.body.supervisor_id) errors.push({ msg: 'Supervisor is required for Field Worker' });
  } else if (role === 'CONTRACTOR') {
    if (!req.body.company_name || String(req.body.company_name).trim() === '') errors.push({ msg: 'Company name is required for Contractor' });
    if (!req.body.contact_details || String(req.body.contact_details).trim() === '') errors.push({ msg: 'Contact details are required for Contractor' });
  }
  if (errors.length > 0) return res.status(400).json({ message: 'Validation failed', errors });
  next();
};

const validateRoleBasedFieldsUpdate = (req, res, next) => {
  // Normalize role to uppercase for comparison
  const role = req.body.role ? req.body.role.toUpperCase().replace(/-/g, '_') : req.body.role;
  if (!role || !['EO', 'SUPERVISOR', 'FIELD_WORKER', 'CONTRACTOR'].includes(role)) return next();
  const errors = [];
  if (role === 'EO') {
    // Check for ulb_id (UUID) instead of assigned_ulb (name)
    // Only validate if ulb_id is being updated (provided in request)
    if (req.body.ulb_id !== undefined && (!req.body.ulb_id || String(req.body.ulb_id).trim() === '')) {
      errors.push({ msg: 'ULB ID is required for EO' });
    }
    // Only validate ward_ids if being updated
    if (req.body.ward_ids !== undefined && (!Array.isArray(req.body.ward_ids) || req.body.ward_ids.length === 0)) {
      errors.push({ msg: 'At least one ward is required for EO' });
    }
  } else if (role === 'SUPERVISOR') {
    if (req.body.ward_id !== undefined && !req.body.ward_id) errors.push({ msg: 'Ward is required for Supervisor' });
    if (req.body.eo_id !== undefined && !req.body.eo_id) errors.push({ msg: 'EO is required for Supervisor' });
  } else if (role === 'FIELD_WORKER') {
    if (req.body.worker_type !== undefined && (!req.body.worker_type || !['ULB', 'CONTRACTUAL'].includes(req.body.worker_type))) errors.push({ msg: 'Worker Type (ULB or CONTRACTUAL) is required for Field Worker' });
    if (req.body.ward_id !== undefined && !req.body.ward_id) errors.push({ msg: 'Ward is required for Field Worker' });
    if (req.body.supervisor_id !== undefined && !req.body.supervisor_id) errors.push({ msg: 'Supervisor is required for Field Worker' });
  } else if (role === 'CONTRACTOR') {
    if (req.body.company_name !== undefined && (!req.body.company_name || String(req.body.company_name).trim() === '')) errors.push({ msg: 'Company name is required for Contractor' });
    if (req.body.contact_details !== undefined && (!req.body.contact_details || String(req.body.contact_details).trim() === '')) errors.push({ msg: 'Contact details are required for Contractor' });
  }
  if (errors.length > 0) return res.status(400).json({ message: 'Validation failed', errors });
  next();
};

const updateEmployeeValidation = [
  body('full_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Full name cannot be empty')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  
  body('role')
    .optional()
    .custom((value) => {
      if (!value) return true; // Optional field
      const normalizedValue = value.toUpperCase().replace(/-/g, '_');
      const allowedRoles = ['CLERK', 'INSPECTOR', 'OFFICER', 'COLLECTOR', 'EO', 'SUPERVISOR', 'FIELD_WORKER', 'CONTRACTOR', 'ADMIN'];
      if (!allowedRoles.includes(normalizedValue)) {
        throw new Error(`Role must be one of: ${allowedRoles.join(', ')}`);
      }
      return true;
    })
    .customSanitizer((value) => {
      // Normalize role to uppercase with underscores
      return value ? value.toUpperCase().replace(/-/g, '_') : value;
    }),
  
  body('phone_number')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Phone number cannot be empty')
    .isLength({ min: 6, max: 15 })
    .withMessage('Phone number must be between 6 and 15 digits')
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('Phone number can only contain digits, +, -, spaces, and parentheses'),
  
  body('email')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Email cannot be empty')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('ward_ids')
    .custom((value, { req }) => {
      const role = req.body.role;
      if (role === 'clerk') {
        if (!Array.isArray(value) || value.length !== 1) {
          throw new Error('Clerk must be assigned exactly one ward');
        }
        if (!Number.isInteger(value[0]) || value[0] <= 0) {
          throw new Error('Ward ID must be a positive integer');
        }
      } else if (role === 'eo' && value !== undefined) {
        if (!Array.isArray(value) || value.length === 0) {
          throw new Error('EO must be assigned at least one ward');
        }
        if (!value.every(id => Number.isInteger(id) && id > 0)) {
          throw new Error('All ward IDs must be positive integers');
        }
      } else if (value !== undefined) {
        if (!Array.isArray(value)) {
          throw new Error('Ward IDs must be an array');
        }
        if (value.length > 0 && !value.every(id => Number.isInteger(id) && id > 0)) {
          throw new Error('All ward IDs must be positive integers');
        }
      }
      return true;
    }),
  body('assigned_ulb').optional().trim(), // Deprecated - kept for backward compatibility
  body('ulb_id')
    .optional()
    .custom((value, { req }) => {
      // If ulb_id is provided, validate it's a UUID
      if (value !== undefined && value !== null && value !== '') {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(value)) {
          throw new Error('ULB ID must be a valid UUID');
        }
      }
      return true;
    }),
  body('ward_id').optional().isInt({ min: 1 }),
  body('eo_id').optional().isInt({ min: 1 }),
  body('supervisor_id').optional().isInt({ min: 1 }),
  body('contractor_id').optional().isInt({ min: 1 }),
  body('worker_type').optional().isIn(['ULB', 'CONTRACTUAL']),
  body('company_name').optional().trim(),
  body('contact_details').optional().trim(),
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be either active or inactive'),

  body('password')
    .optional()
    .custom((value) => {
      console.log('🔍 Debug - Password validation:', {
        value: value ? '***' : 'EMPTY',
        length: value ? value.length : 0,
        isEmpty: !value || value.trim() === ''
      });
      
      // Allow empty password (no change) or valid password
      if (!value || value.trim() === '') {
        console.log('✅ Password validation: Empty password allowed');
        return true; // Empty password is allowed (no change)
      }
      
      // Simple validation: at least 4 characters
      if (value.length < 4) {
        console.log('❌ Password validation: Length failed');
        throw new Error('Password must be at least 4 characters long');
      }
      
      console.log('✅ Password validation: All checks passed');
      return true;
    })
    .withMessage('Password must be at least 4 characters long')
];

// Bulk operations validation
const bulkDeleteValidation = [
  body('employeeIds')
    .isArray()
    .withMessage('Employee IDs must be an array')
    .custom((value) => {
      if (!value || value.length === 0) {
        throw new Error('At least one employee ID is required');
      }
      return value.every(id => Number.isInteger(id) && id > 0);
    })
    .withMessage('All employee IDs must be positive integers')
];

const bulkStatusUpdateValidation = [
  body('employeeIds')
    .isArray()
    .withMessage('Employee IDs must be an array')
    .custom((value) => {
      if (!value || value.length === 0) {
        throw new Error('At least one employee ID is required');
      }
      return value.every(id => Number.isInteger(id) && id > 0);
    })
    .withMessage('All employee IDs must be positive integers'),
  
  body('status')
    .isIn(['activate', 'deactivate'])
    .withMessage('Status must be either activate or deactivate')
];

// Middleware to allow EO access for specific endpoints
const requireEoOrAdmin = (req, res, next) => {
  const normalizedRole = req.user?.role ? req.user.role.toUpperCase().replace(/-/g, '_') : null;
  const isEo = req.userType === 'admin_management' && normalizedRole === 'EO';
  const isAdmin = req.userType === 'user' && req.user?.role === 'admin';
  
  if (isEo || isAdmin) {
    return next();
  }
  
  return res.status(403).json({ message: 'EO or Admin access required' });
};

// Apply admin authentication to all routes except wards endpoint and by-ulb endpoint
router.use((req, res, next) => {
  if (req.path === '/employees/wards' || req.path === '/employees/by-ulb') {
    // Use basic authentication for these endpoints - allow authenticated users
    return authenticate(req, res, next);
  }
  return requireAdmin(req, res, next);
});

// Employee management routes
router.get('/employees', getAllEmployees);
router.get('/employees/by-ulb', requireEoOrAdmin, getEmployeesByUlb); // EO can access this
router.get('/employees/statistics', getEmployeeStatistics);
router.get('/employees/wards', getAvailableWards);
router.get('/ulbs', getAllULBs);
router.get('/employees/:id', getEmployeeById);

router.post('/employees', createEmployeeValidation, validateRoleBasedFields, createEmployee);
router.put('/employees/:id', updateEmployeeValidation, validateRoleBasedFieldsUpdate, updateEmployee);
router.delete('/employees/:id', deleteEmployee);
router.post('/employees/:id/reset-password', resetEmployeePassword);

// Bulk operations routes
router.post('/employees/bulk-delete', bulkDeleteValidation, bulkDeleteEmployees);
router.post('/employees/bulk-status-update', bulkStatusUpdateValidation, bulkUpdateEmployeeStatus);

export default router;
