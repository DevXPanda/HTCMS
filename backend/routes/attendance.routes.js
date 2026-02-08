import express from 'express';
import { authenticate, authorize } from '../middleware/enhancedAuth.js';
import {
  getAttendanceRecords,
  getAttendanceById,
  getAttendanceStats
} from '../controllers/attendance.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get attendance statistics (Admin, Assessor only)
router.get('/stats/summary', authorize('admin', 'assessor'), getAttendanceStats);

// Get attendance records (role-based access)
router.get('/', (req, res, next) => {
  console.log('🔍 Attendance API - Get attendance records called');
  console.log('👤 Attendance API - Authenticated user:', {
    id: req.user?.id,
    role: req.user?.role,
    userType: req.user?.userType,
    employee_id: req.user?.employee_id
  });
  next();
}, getAttendanceRecords);

// Get attendance record by ID (role-based access)
router.get('/:id', getAttendanceById);

export default router;
