import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
    getAllAssessments,
    getAssessmentById,
    createAssessment,
    updateAssessment,
    approveAssessment,
    rejectAssessment,
    submitAssessment,
    getAssessmentsByProperty,
    generateUnifiedAssessment
} from '../controllers/assessment.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all assessments (filtered by role)
router.get('/', getAllAssessments);

// Get assessments by property
router.get('/property/:propertyId', getAssessmentsByProperty);

// Get assessment by ID
router.get('/:id', getAssessmentById);

// Create assessment (Assessor, Admin)
router.post('/', authorize('admin', 'assessor'), createAssessment);

// Update assessment (Assessor, Admin)
router.put('/:id', authorize('admin', 'assessor'), updateAssessment);

// Generate unified assessment and demand (Assessor, Admin)
router.post('/generate-unified', authorize('admin', 'assessor'), generateUnifiedAssessment);

// Submit assessment for approval (Assessor, Admin)
router.post('/:id/submit', authorize('admin', 'assessor'), submitAssessment);

// Approve assessment (Admin only)
router.post('/:id/approve', authorize('admin'), approveAssessment);

// Reject assessment (Admin only)
router.post('/:id/reject', authorize('admin'), rejectAssessment);

export default router; 
