import express from 'express';
import { authenticate } from '../middleware/enhancedAuth.js';
import {
  createApprovalRequest,
  listApprovalRequests,
  getApprovalRequestById,
  approveRequest,
  rejectRequest
} from '../controllers/paymentApprovalRequest.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/', listApprovalRequests);
router.get('/:id', getApprovalRequestById);
router.post('/', createApprovalRequest);
router.patch('/:id/approve', approveRequest);
router.patch('/:id/reject', rejectRequest);

export default router;
