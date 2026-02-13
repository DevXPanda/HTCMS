import express from 'express';
import { authenticate, authorize, requireWardAccess } from '../middleware/enhancedAuth.js';
import {
  getAllShopRegistrationRequests,
  getShopRegistrationRequestById,
  createShopRegistrationRequest,
  approveShopRegistrationRequest,
  rejectShopRegistrationRequest
} from '../controllers/shopRegistrationRequest.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Citizen routes (no ward filtering needed - citizens see only their own)
router.post('/', authorize('citizen'), createShopRegistrationRequest);

// Admin/Clerk routes (ward-filtered)
router.use(requireWardAccess);
router.get('/', authorize('admin', 'clerk'), getAllShopRegistrationRequests);
router.get('/:id', authorize('admin', 'clerk'), getShopRegistrationRequestById);
router.post('/:id/approve', authorize('admin', 'clerk'), approveShopRegistrationRequest);
router.post('/:id/reject', authorize('admin', 'clerk'), rejectShopRegistrationRequest);

export default router;
