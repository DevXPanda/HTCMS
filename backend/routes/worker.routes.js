import express from 'express';
import { authenticate } from '../middleware/enhancedAuth.js';
import { createWorker, getAllWorkers } from '../controllers/worker.controller.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Validation middleware
const createWorkerValidation = [
  body('full_name')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Full name must be between 2 and 255 characters'),

  body('mobile')
    .trim()
    .notEmpty()
    .withMessage('Mobile number is required')
    .isLength({ min: 10, max: 20 })
    .withMessage('Mobile number must be between 10 and 20 characters')
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('Mobile number can only contain digits, +, -, spaces, and parentheses'),

  body('worker_type')
    .trim()
    .notEmpty()
    .withMessage('Worker type is required')
    .custom((value) => {
      const normalized = value.toUpperCase();
      if (!['ULB', 'CONTRACTUAL'].includes(normalized)) {
        throw new Error('Worker type must be either ULB or CONTRACTUAL');
      }
      return true;
    })
    .customSanitizer((value) => value.toUpperCase()),

  body('ward_id')
    .notEmpty()
    .withMessage('Ward ID is required')
    .isInt()
    .withMessage('Ward ID must be an integer'),

  body('supervisor_id')
    .notEmpty()
    .withMessage('Supervisor ID is required')
    .isInt()
    .withMessage('Supervisor ID must be an integer'),

  body('contractor_id')
    .optional()
    .isInt()
    .withMessage('Contractor ID must be an integer'),

  body('status')
    .optional()
    .custom((value) => {
      if (value) {
        const normalized = value.toUpperCase();
        if (!['ACTIVE', 'INACTIVE'].includes(normalized)) {
          throw new Error('Status must be either ACTIVE or INACTIVE');
        }
      }
      return true;
    })
    .customSanitizer((value) => value ? value.toUpperCase() : 'ACTIVE'),

  // For ADMIN role only
  body('ulb_id')
    .optional()
    .isUUID()
    .withMessage('ULB ID must be a valid UUID'),

  body('eo_id')
    .optional()
    .isInt()
    .withMessage('EO ID must be an integer')
];

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Role check middleware
const checkRoleAccess = (req, res, next) => {
  const userRole = req.user?.role ? req.user.role.toUpperCase().replace(/-/g, '_') : null;

  if (userRole === 'SUPERVISOR') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. SUPERVISOR role cannot create workers.'
    });
  }

  if (userRole !== 'ADMIN' && userRole !== 'EO') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only ADMIN and EO roles can create workers.'
    });
  }

  // For ADMIN role, require ulb_id and eo_id in request
  if (userRole === 'ADMIN') {
    if (!req.body.ulb_id || !req.body.eo_id) {
      return res.status(400).json({
        success: false,
        message: 'ulb_id and eo_id are required for ADMIN role'
      });
    }
  }

  next();
};

router.use(authenticate);

// Get all workers with details and proofs (ADMIN, EO only)
router.get('/', getAllWorkers);

// Create worker (ADMIN, EO only)
router.post('/', createWorkerValidation, validateRequest, checkRoleAccess, createWorker);

export default router;
