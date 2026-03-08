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
import { approveWaterConnectionRequest, rejectWaterConnectionRequest } from '../controllers/waterConnection.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create and submit water connection request (Clerk, Admin, Super Admin)
router.post('/create-and-submit', authorize('clerk', 'admin', 'super_admin'), createAndSubmitWaterConnectionRequest);

// Create water connection request (Citizen, Clerk, Admin, Super Admin)
router.post('/', authorize('citizen', 'clerk', 'admin', 'super_admin'), createWaterConnectionRequest);

// Get all requests (Citizen sees own, Clerk/Assessor/Admin/Super Admin see filtered)
router.get('/', authorize('citizen', 'clerk', 'assessor', 'admin', 'super_admin'), getWaterConnectionRequests);

// Get request by ID
router.get('/:id', authorize('citizen', 'clerk', 'assessor', 'admin', 'super_admin'), getWaterConnectionRequestById);

// Update request (Citizen, Clerk, Admin, Super Admin - only DRAFT/RETURNED)
router.put('/:id', authorize('citizen', 'clerk', 'admin', 'super_admin'), updateWaterConnectionRequest);

// Submit request for inspection
router.post('/:id/submit', authorize('citizen', 'clerk', 'admin', 'super_admin'), submitWaterConnectionRequest);

// Process request - forward to inspector or reject (Clerk, Admin, Super Admin)
router.post('/:id/process', authorize('clerk', 'admin', 'super_admin'), processWaterApplication);

// Inspection review (Assessor, Admin, Super Admin)
router.post('/:id/review', authorize('assessor', 'admin', 'super_admin'), inspectionReviewWaterConnectionRequest);

// Approve request and create connection (Admin, Super Admin)
router.post('/:id/approve', authorize('admin', 'super_admin'), approveWaterConnectionRequest);

// Reject request (Admin, Super Admin)
router.post('/:id/reject', authorize('admin', 'super_admin'), rejectWaterConnectionRequest);

// Delete request (Citizen, Clerk, Admin, Super Admin - DRAFT only; Admin/Super Admin may delete others)
router.delete('/:id', authorize('citizen', 'clerk', 'admin', 'super_admin'), deleteWaterConnectionRequest);

export default router;
