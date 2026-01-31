import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getAllWaterConnectionRequests,
  getWaterConnectionRequestById,
  approveWaterConnectionRequest,
  rejectWaterConnectionRequest
} from '../controllers/waterConnection.controller.js';

const router = express.Router();

// All routes require authentication and admin/assessor role
router.use(authenticate);
router.use(authorize('admin', 'assessor'));

// Get all water connection requests
router.get('/', getAllWaterConnectionRequests);

// Get water connection request by ID
router.get('/:id', getWaterConnectionRequestById);

// Approve water connection request
router.post('/:id/approve', approveWaterConnectionRequest);

// Reject water connection request
router.post('/:id/reject', rejectWaterConnectionRequest);

export default router;
