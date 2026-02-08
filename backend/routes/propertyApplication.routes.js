import express from 'express';
import { authenticate, authorize } from '../middleware/enhancedAuth.js';
import {
    createPropertyApplication,
    getPropertyApplications,
    getPropertyApplicationById,
    updatePropertyApplication,
    submitPropertyApplication,
    inspectionReviewApplication,
    deletePropertyApplication
} from '../controllers/propertyApplication.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create property application (Clerk, Admin)
router.post('/', authorize('clerk', 'admin'), createPropertyApplication);

// Get all applications (Clerk sees own, Assessor/Admin see all)
router.get('/', authorize('clerk', 'assessor', 'admin'), getPropertyApplications);

// Get application by ID (Clerk sees own, Assessor/Admin see all)
router.get('/:id', authorize('clerk', 'assessor', 'admin'), getPropertyApplicationById);

// Update application (Clerk, Admin - only DRAFT/RETURNED)
router.put('/:id', authorize('clerk', 'admin'), updatePropertyApplication);

// Submit application for inspection (Clerk, Admin)
router.post('/:id/submit', authorize('clerk', 'admin'), submitPropertyApplication);

// Inspection review (Assessor, Admin only)
router.post('/:id/review', authorize('assessor', 'admin'), inspectionReviewApplication);

// Delete application (Clerk, Admin - only DRAFT)
router.delete('/:id', authorize('clerk', 'admin'), deletePropertyApplication);

export default router;
