import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getAllPayments,
  getPaymentById,
  createPayment,
  getPaymentReceipt,
  getPaymentStatistics,
  getPaymentsByDemand,
  createOnlinePaymentOrder,
  verifyOnlinePayment,
  generateReceiptPdf,
  downloadReceiptPdf
} from '../controllers/payment.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get payment statistics
router.get('/statistics/summary', getPaymentStatistics);

// Get payments by demand
router.get('/demand/:demandId', getPaymentsByDemand);

// Get all payments (filtered by role)
router.get('/', getAllPayments);

// Online payment routes (must be before /:id)
router.post('/online/create-order', createOnlinePaymentOrder);
router.post('/online/verify', verifyOnlinePayment);

// PDF routes (must be before /:id)
router.get('/receipts/:filename', downloadReceiptPdf);
router.post('/:id/generate-receipt', generateReceiptPdf);

// Get payment receipt by receipt number (must be before /:id)
router.get('/receipt/:receiptNumber', getPaymentReceipt);

// Get payment by ID
router.get('/:id', getPaymentById);

// Create payment (Cashier, Admin) - for offline payments
router.post('/', authorize('admin', 'cashier'), createPayment);

export default router;
