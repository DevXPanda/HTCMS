import express from 'express';
import { authenticate, requireAdmin } from '../middleware/enhancedAuth.js';
import {
  generatePayroll,
  getPayroll,
  verifyPayroll,
  approvePayroll
} from '../controllers/payroll.controller.js';

const router = express.Router();

router.use(authenticate);

router.post('/generate', requireAdmin, generatePayroll);
router.get('/', requireAdmin, getPayroll);

router.patch('/:id/verify', verifyPayroll);
router.patch('/:id/approve', requireAdmin, approvePayroll);

export default router;
