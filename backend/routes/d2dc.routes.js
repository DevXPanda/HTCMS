import express from 'express';
import { authenticate as protect, authorize } from '../middleware/auth.js';
import {
    getCollectorStats,
    getInspectorStats,
    getD2DCActivity,
    searchProperties,
    generateD2DCDemand,
    collectD2DCPayment,
    getD2DCDemands,
    getD2DCPayments
} from '../controllers/d2dc.controller.js';

const router = express.Router();

router.get('/collector/stats', protect, authorize('collector', 'admin'), getCollectorStats);
router.get('/inspector/stats', protect, authorize('inspector', 'admin'), getInspectorStats);
router.get('/activity', protect, authorize('collector', 'inspector', 'admin'), getD2DCActivity);

// Collector actions
router.get('/search/properties', protect, authorize('collector', 'admin'), searchProperties);
router.post('/demand/generate', protect, authorize('collector', 'admin'), generateD2DCDemand);
router.post('/payment/collect', protect, authorize('collector', 'admin'), collectD2DCPayment);

// Inspector/Admin monitoring
router.get('/demands', protect, authorize('inspector', 'admin'), getD2DCDemands);
router.get('/payments', protect, authorize('inspector', 'admin'), getD2DCPayments);

export default router;
