import express from 'express';
import { authenticate, authorize } from '../middleware/enhancedAuth.js';
import {
  createWaterConnectionRequest,
  createAndSubmitWaterConnectionRequest,
  getWaterConnectionRequests,
  getWaterConnectionRequestById,
  updateWaterConnectionRequest,
  submitWaterConnectionRequest,
  inspectionReviewWaterConnectionRequest,
  deleteWaterConnectionRequest
} from '../controllers/waterConnectionRequest.controller.js';
import { processWaterApplication } from '../controllers/clerk.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create and submit water connection request (Clerk, Admin) - for immediate submission
router.post('/create-and-submit', authorize('clerk', 'admin'), createAndSubmitWaterConnectionRequest);

// Create water connection request (Citizen, Clerk, Admin)
router.post('/', authorize('citizen', 'clerk', 'admin'), createWaterConnectionRequest);

// Get all requests (Citizen sees own, Clerk sees created, Assessor/Admin see all)
router.get('/', authorize('citizen', 'clerk', 'assessor', 'admin'), getWaterConnectionRequests);

// Get request by ID (Citizen sees own, Clerk sees created, Assessor/Admin see all)
router.get('/:id', authorize('citizen', 'clerk', 'assessor', 'admin'), getWaterConnectionRequestById);

// Update request (Citizen, Clerk, Admin - only DRAFT/RETURNED)
router.put('/:id', authorize('citizen', 'clerk', 'admin'), updateWaterConnectionRequest);

// Submit request for inspection (Citizen, Clerk, Admin)
router.post('/:id/submit', authorize('citizen', 'clerk', 'admin'), submitWaterConnectionRequest);

// Process request - forward to inspector or reject (Clerk, Admin only)
router.post('/:id/process', authorize('clerk', 'admin'), processWaterApplication);

// Inspection review (Assessor, Admin only)
router.post('/:id/review', authorize('assessor', 'admin'), inspectionReviewWaterConnectionRequest);

// Delete request (Citizen, Clerk, Admin - only DRAFT)
router.delete('/:id', authorize('citizen', 'clerk', 'admin'), deleteWaterConnectionRequest);

export default router;
