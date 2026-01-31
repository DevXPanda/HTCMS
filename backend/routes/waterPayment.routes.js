import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createWaterPayment,
  getAllWaterPayments,
  getWaterPaymentById,
  getWaterPaymentsByBill,
  getWaterPaymentsByConnection
} from '../controllers/waterPayment.controller.js';

const router = express.Router();

// All routes require authentication (no role checks as per requirements)
router.use(authenticate);

// Get all water payments (with filters)
router.get('/', getAllWaterPayments);

// Get payments by bill
router.get('/bill/:waterBillId', getWaterPaymentsByBill);

// Get payments by connection
router.get('/connection/:waterConnectionId', getWaterPaymentsByConnection);

// Get water payment by ID
router.get('/:id', getWaterPaymentById);

// Create water payment
router.post('/', createWaterPayment);

export default router;
