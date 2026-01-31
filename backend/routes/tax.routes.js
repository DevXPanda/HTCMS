import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getUnifiedTaxSummary } from '../controllers/demand.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get unified tax summary
router.get('/unified-summary', getUnifiedTaxSummary);

export default router;
