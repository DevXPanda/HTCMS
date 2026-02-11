import express from 'express';
import { authenticate, authorize, requireWardAccess } from '../middleware/enhancedAuth.js';
import {
  getAllShopTaxAssessments,
  getShopTaxAssessmentById,
  createShopTaxAssessment,
  updateShopTaxAssessment,
  submitShopTaxAssessment,
  approveShopTaxAssessment,
  rejectShopTaxAssessment
} from '../controllers/shopTaxAssessment.controller.js';

const router = express.Router();

router.use(authenticate);
router.use(requireWardAccess);

router.get('/', getAllShopTaxAssessments);
router.get('/:id', getShopTaxAssessmentById);

router.post('/', authorize('admin', 'assessor', 'clerk'), createShopTaxAssessment);
router.put('/:id', authorize('admin', 'assessor', 'clerk'), updateShopTaxAssessment);
router.post('/:id/submit', authorize('admin', 'assessor', 'clerk'), submitShopTaxAssessment);
router.post('/:id/approve', authorize('admin'), approveShopTaxAssessment);
router.post('/:id/reject', authorize('admin'), rejectShopTaxAssessment);

export default router;
