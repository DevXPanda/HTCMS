import express from 'express';
import {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getAvailableWards,
  resetEmployeePassword,
  getEmployeeStatistics,
  bulkDeleteEmployees,
  bulkUpdateEmployeeStatus
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
    .isIn(['clerk', 'inspector', 'officer', 'collector'])
    .withMessage('Role must be one of: clerk, inspector, officer, collector'),
  
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
      if (req.body.role === 'clerk') {
        if (!Array.isArray(value) || value.length !== 1) {
          throw new Error('Clerk must be assigned exactly one ward');
        }
        if (!Number.isInteger(value[0]) || value[0] <= 0) {
          throw new Error('Ward ID must be a positive integer');
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
  
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be either active or inactive')
];

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
    .isIn(['clerk', 'inspector', 'officer', 'collector'])
    .withMessage('Role must be one of: clerk, inspector, officer, collector'),
  
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
      if (req.body.role === 'clerk') {
        if (!Array.isArray(value) || value.length !== 1) {
          throw new Error('Clerk must be assigned exactly one ward');
        }
        if (!Number.isInteger(value[0]) || value[0] <= 0) {
          throw new Error('Ward ID must be a positive integer');
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

// Apply admin authentication to all routes except wards endpoint
router.use((req, res, next) => {
  if (req.path === '/employees/wards') {
    // Use basic authentication for wards endpoint - allow any authenticated user
    return authenticate(req, res, next);
  }
  return requireAdmin(req, res, next);
});

// Employee management routes
router.get('/employees', getAllEmployees);
router.get('/employees/statistics', getEmployeeStatistics);
router.get('/employees/wards', getAvailableWards);
router.get('/employees/:id', getEmployeeById);

router.post('/employees', createEmployeeValidation, createEmployee);
router.put('/employees/:id', updateEmployeeValidation, updateEmployee);
router.delete('/employees/:id', deleteEmployee);
router.post('/employees/:id/reset-password', resetEmployeePassword);

// Bulk operations routes
router.post('/employees/bulk-delete', bulkDeleteValidation, bulkDeleteEmployees);
router.post('/employees/bulk-status-update', bulkStatusUpdateValidation, bulkUpdateEmployeeStatus);

export default router;
