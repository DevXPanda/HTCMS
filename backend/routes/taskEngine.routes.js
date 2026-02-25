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

  next();
}, authorize('collector'), getDailyTasks);

// Generate daily tasks (Admin only) - Multiple routes for flexibility
router.post('/generate', authorize('admin'), generateDailyTasks);
router.post('/admin/generate-daily', authorize('admin'), generateDailyTasks);

// Complete task (Collector only)
router.patch('/:id/complete', authorize('collector'), completeTask);

export default router;
