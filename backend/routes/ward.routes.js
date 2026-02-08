import express from 'express';
import { authenticate, authorize } from '../middleware/enhancedAuth.js';
import { wardAccessControl } from '../middleware/wardAccess.js';
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

// Get collector dashboard (authenticated collector only)
router.get('/collector/dashboard', getCollectorDashboard);

// Get wards by collector
router.get('/collector/:collectorId', getWardsByCollector);

// Get all wards - with ward access control for non-admin users
router.get('/', wardAccessControl, getAllWards);

// Get ward statistics - with ward access control for non-admin users
router.get('/:id/statistics', wardAccessControl, getWardStatistics);

// Get ward by ID - with ward access control for non-admin users
router.get('/:id', wardAccessControl, getWardById);

// Admin only routes
router.post('/', authorize('admin'), createWard);
router.put('/:id', authorize('admin'), updateWard);
router.put('/:id/assign-collector', authorize('admin'), assignCollector);
router.delete('/:id', authorize('admin'), deleteWard);

export default router;
