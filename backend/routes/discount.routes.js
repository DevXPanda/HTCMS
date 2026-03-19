import express from 'express';
import { authenticate, authorize } from '../middleware/enhancedAuth.js';
import { createDiscount, getDiscountSummary, getDiscountHistory, getDiscountPdf } from '../controllers/discount.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/summary', authorize('admin', 'ACCOUNT_OFFICER'), getDiscountSummary);
router.get('/history', authorize('admin', 'ACCOUNT_OFFICER'), getDiscountHistory);
router.get('/:id/pdf', getDiscountPdf);
router.post('/', authorize('admin'), createDiscount);

export default router;
