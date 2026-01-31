import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  generateWaterBill,
  getAllWaterBills,
  getWaterBillById,
  getWaterBillsByConnection
} from '../controllers/waterBill.controller.js';

const router = express.Router();

// All routes require authentication (no role checks as per requirements)
router.use(authenticate);

// Generate water bill
router.post('/generate', generateWaterBill);

// Get all water bills (with filters)
router.get('/', getAllWaterBills);

// Get water bills by connection
router.get('/connection/:waterConnectionId', getWaterBillsByConnection);

// Get water bill by ID
router.get('/:id', getWaterBillById);

export default router;
