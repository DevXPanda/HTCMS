import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
    getAllWards,
    getWardById,
    createWard,
    updateWard,
    assignCollector,
    deleteWard,
    getWardStatistics,
    getWardsByCollector,
    getCollectorDashboard
} from '../controllers/ward.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get collector dashboard
router.get('/collector/:collectorId/dashboard', getCollectorDashboard);

// Get wards by collector
router.get('/collector/:collectorId', getWardsByCollector);

// Get all wards
router.get('/', getAllWards);

// Get ward statistics
router.get('/:id/statistics', getWardStatistics);

// Get ward by ID
router.get('/:id', getWardById);

// Admin only routes
router.post('/', authorize('admin'), createWard);
router.put('/:id', authorize('admin'), updateWard);
router.put('/:id/assign-collector', authorize('admin'), assignCollector);
router.delete('/:id', authorize('admin'), deleteWard);

export default router;
