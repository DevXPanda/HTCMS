import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getCitizenDashboard,
  getCollectorDashboard,
  getCollectorUnpaidBills,
  getCollectorCollectionSummary
} from '../controllers/waterDashboard.controller.js';

const router = express.Router();

// All routes require authentication (no role checks as per requirements)
router.use(authenticate);

// Citizen dashboard
router.get('/citizen', getCitizenDashboard);

// Collector dashboard
router.get('/collector', getCollectorDashboard);
router.get('/collector/unpaid-bills', getCollectorUnpaidBills);
router.get('/collector/collection-summary', getCollectorCollectionSummary);

export default router;
