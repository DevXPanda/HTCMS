import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getCitizenDashboard,
  getCitizenProperties,
  getCitizenDemands,
  getCitizenPayments
} from '../controllers/citizen.controller.js';
import {
  getCitizenNotices,
  getCitizenNoticeById
} from '../controllers/notice.controller.js';

const router = express.Router();

// All routes require authentication and citizen role
router.use(authenticate);
router.use(authorize('citizen'));

// Citizen dashboard
router.get('/dashboard', getCitizenDashboard);

// Get citizen's properties
router.get('/properties', getCitizenProperties);

// Get citizen's demands
router.get('/demands', getCitizenDemands);

// Get citizen's payment history
router.get('/payments', getCitizenPayments);

// Get citizen's notices
router.get('/notices', getCitizenNotices);
router.get('/notices/:id', getCitizenNoticeById);

export default router;
