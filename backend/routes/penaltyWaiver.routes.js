import express from 'express';
import { authenticate, authorize } from '../middleware/enhancedAuth.js';
import { createPenaltyWaiver, getPenaltyWaiverSummary, getPenaltyWaiverHistory, getPenaltyWaiverPdf } from '../controllers/penaltyWaiver.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/summary', authorize('admin', 'ACCOUNT_OFFICER'), getPenaltyWaiverSummary);
router.get('/history', authorize('admin', 'ACCOUNT_OFFICER'), getPenaltyWaiverHistory);
router.get('/:id/pdf', getPenaltyWaiverPdf);
router.post('/', authorize('admin'), createPenaltyWaiver);

export default router;
