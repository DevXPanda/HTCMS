import express from 'express';
import {
  getAllPenaltyRules,
  getPenaltyRuleById,
  createPenaltyRule,
  updatePenaltyRule,
  deletePenaltyRule
} from '../controllers/penaltyRule.controller.js';
import {
  getCronStatus,
  triggerCronJob
} from '../controllers/penaltyCron.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Penalty cron job routes (Admin only)
router.get('/cron/status', authorize('admin'), getCronStatus);
router.post('/cron/trigger', authorize('admin'), triggerCronJob);

// Get all penalty rules (Admin, Assessor)
router.get('/', authorize('admin', 'assessor'), getAllPenaltyRules);

// Get penalty rule by ID (Admin, Assessor)
router.get('/:id', authorize('admin', 'assessor'), getPenaltyRuleById);

// Create penalty rule (Admin only)
router.post('/', authorize('admin'), createPenaltyRule);

// Update penalty rule (Admin only)
router.put('/:id', authorize('admin'), updatePenaltyRule);

// Delete penalty rule (Admin only)
router.delete('/:id', authorize('admin'), deletePenaltyRule);

export default router;
