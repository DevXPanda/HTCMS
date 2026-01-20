import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
    getAllDemands,
    getDemandById,
    createDemand,
    createD2DCDemand,
    generateBulkDemands,
    calculatePenalty,
    getDemandsByProperty,
    getDemandStatistics
} from '../controllers/demand.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get demand statistics
router.get('/statistics/summary', getDemandStatistics);

// Get demands by property
router.get('/property/:propertyId', getDemandsByProperty);

// Get all demands (filtered by role)
router.get('/', getAllDemands);

// Generate D2DC demand (Admin only) - Must be before /:id route
router.post('/d2dc', authorize('admin'), createD2DCDemand);

// Generate bulk demands (Admin only) - Must be before /:id route
router.post('/generate-bulk', authorize('admin'), generateBulkDemands);

// Get demand by ID
router.get('/:id', getDemandById);

// Create single demand (Admin, Assessor)
router.post('/', authorize('admin', 'assessor'), createDemand);

// Calculate penalty for overdue demand (Admin, Cashier)
router.put('/:id/calculate-penalty', authorize('admin', 'cashier'), calculatePenalty);

export default router;
