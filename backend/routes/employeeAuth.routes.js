import express from 'express';
import {
  employeeLogin,
  changeEmployeePassword,
  getEmployeeProfile,
  updateEmployeeProfile,
  refreshEmployeeToken,
  employeeLogout
} from '../controllers/employeeAuth.controller.js';
import { authenticateEmployee } from '../middleware/enhancedAuth.js';
import { body } from 'express-validator';

const router = express.Router();

// Validation rules
const loginValidation = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Employee ID, email, or phone number is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
];

const updateProfileValidation = [
  body('full_name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Full name cannot be empty')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  
  body('phone_number')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Phone number cannot be empty')
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  body('email')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Email cannot be empty')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
];

// Employee authentication routes
router.post('/login', loginValidation, employeeLogin);
router.post('/refresh-token', authenticateEmployee, refreshEmployeeToken);

// Protected employee routes
router.use(authenticateEmployee);

router.get('/profile', getEmployeeProfile);
router.put('/profile', updateProfileValidation, updateEmployeeProfile);
router.post('/change-password', changePasswordValidation, changeEmployeePassword);
router.post('/logout', employeeLogout);

export default router;
