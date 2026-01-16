import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getFieldDashboard,
  getCollectorDetails,
  getFollowUps
} from '../controllers/fieldMonitoring.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// All routes require admin or assessor role
router.use(authorize('admin', 'assessor'));

// Get field operations dashboard
router.get('/dashboard', getFieldDashboard);

// Get collector details
router.get('/collector/:collectorId', getCollectorDetails);

// Get follow-ups
router.get('/follow-ups', getFollowUps);

export default router;
