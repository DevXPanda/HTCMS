import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getAllWaterTaxAssessments,
  getWaterTaxAssessmentById,
  createWaterTaxAssessment
} from '../controllers/waterTaxAssessment.controller.js';

const router = express.Router();

// All routes require authentication (no role checks as per requirements)
router.use(authenticate);

// Get all water tax assessments (with filters)
router.get('/', getAllWaterTaxAssessments);

// Get water tax assessment by ID
router.get('/:id', getWaterTaxAssessmentById);

// Create water tax assessment
router.post('/', createWaterTaxAssessment);

export default router;
