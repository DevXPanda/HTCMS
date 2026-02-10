import express from 'express';
import { authenticate, authorize } from '../middleware/enhancedAuth.js';
import {
  getDailyTasks,
  generateDailyTasks,
  completeTask
} from '../controllers/taskEngine.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get daily tasks (Collector only)
router.get('/daily', (req, res, next) => {
  console.log('🔍 Tasks API - Daily tasks endpoint called');
  console.log('👤 Tasks API - Authenticated user:', {
    id: req.user?.id,
    role: req.user?.role,
    userType: req.userType || (req.user?.userType),
    employee_id: req.user?.employee_id
  });
  next();
}, authorize('collector'), getDailyTasks);

// Generate daily tasks (Admin only) - Multiple routes for flexibility
router.post('/generate', authorize('admin'), generateDailyTasks);
router.post('/admin/generate-daily', authorize('admin'), generateDailyTasks);

// Complete task (Collector only)
router.patch('/:id/complete', authorize('collector'), completeTask);

export default router;
