import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getDashboardStats,
  getRevenueReport,
  getOutstandingReport,
  getWardWiseReport
} from '../controllers/report.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Dashboard stats (Admin, Assessor, Cashier)
router.get('/dashboard', authorize('admin', 'assessor', 'cashier'), getDashboardStats);

// Revenue report (Admin, Cashier)
router.get('/revenue', authorize('admin', 'cashier'), getRevenueReport);

// Outstanding report (Admin, Tax Collector)
router.get('/outstanding', authorize('admin', 'tax_collector'), getOutstandingReport);

// Ward-wise report (Admin only)
router.get('/ward-wise', authorize('admin'), getWardWiseReport);

export default router;
