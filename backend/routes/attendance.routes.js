import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
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
router.get('/', getAttendanceRecords);

// Get attendance record by ID (role-based access)
router.get('/:id', getAttendanceById);

export default router;
