import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getAuditLogs,
  getAuditLogById,
  getAuditLogStats
} from '../controllers/auditLog.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get audit log statistics (Admin, Assessor only)
router.get('/stats/summary', authorize('admin', 'assessor'), getAuditLogStats);

// Get audit logs (role-based access)
router.get('/', getAuditLogs);

// Get audit log by ID (role-based access)
router.get('/:id', getAuditLogById);

export default router;
