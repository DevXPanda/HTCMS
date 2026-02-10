import express from 'express';
import { authenticate, authorize } from '../middleware/enhancedAuth.js';
import {
  createFieldVisit,
  getFieldVisits,
  getFieldVisitById,
  getFieldVisitContext,
  getAdminFieldVisitDetails
} from '../controllers/fieldVisit.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get field visit context for task (Collector only) - Must be before /:id route
router.get('/context/:taskId', authorize('collector'), getFieldVisitContext);

// Get admin field visit details (Admin only) - Must be before /:id route
router.get('/admin/:visitId', authorize('admin'), getAdminFieldVisitDetails);

// Create field visit (Collector only)
router.post('/', authorize('collector'), createFieldVisit);

// Get field visits (role-based access)
router.get('/', getFieldVisits);

// Get field visit by ID (role-based access)
router.get('/:id', getFieldVisitById);

export default router;
