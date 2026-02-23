import express from 'express';
import { authenticate, authorize } from '../middleware/enhancedAuth.js';
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
  downloadReceiptPdf,
  getPaymentPdfById,
  createFieldCollectionPayment
} from '../controllers/payment.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get payment statistics
router.get('/statistics/summary', getPaymentStatistics);

// Get payments by demand
router.get('/demand/:demandId', getPaymentsByDemand);

// Get all payments (filtered by role)
router.get('/', (req, res, next) => {
  console.log('🔍 Payment API - Get all payments called');
  console.log('👤 Payment API - Authenticated user:', {
    id: req.user?.id,
    role: req.user?.role,
    userType: req.user?.userType,
    employee_id: req.user?.employee_id
  });
  console.log('📋 Payment API - Query params:', req.query);
  next();
}, getAllPayments);

// Online payment routes (must be before /:id)
router.post('/online/create-order', createOnlinePaymentOrder);
router.post('/online/verify', verifyOnlinePayment);

// PDF routes (must be before /:id)
router.get('/receipts/:filename', downloadReceiptPdf);
router.get('/:id/pdf', getPaymentPdfById);
router.post('/:id/generate-receipt', generateReceiptPdf);

// Get payment receipt by receipt number (must be before /:id)
router.get('/receipt/:receiptNumber', getPaymentReceipt);

// Get payment by ID
router.get('/:id', getPaymentById);

// Create payment (Cashier, Admin) - for offline payments
router.post('/', authorize('admin', 'cashier', 'collector'), createPayment);

// Field collection payment (Collector, Tax Collector)
router.post('/field-collection', authorize('collector', 'tax_collector'), createFieldCollectionPayment);

export default router;
