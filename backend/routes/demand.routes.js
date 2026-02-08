import express from 'express';
import { authenticate, authorize } from '../middleware/enhancedAuth.js';
import {
    getAllDemands,
    getDemandById,
    createDemand,
    createD2DCDemand,
    generateBulkDemands,
    generateCombinedDemands,
    generateUnifiedDemand,
    calculatePenalty,
    getDemandsByProperty,
    getDemandStatistics,
    getDemandBreakdown,
    getUnifiedTaxSummary
} from '../controllers/demand.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get demand statistics
router.get('/statistics/summary', getDemandStatistics);

// Get demands by property
router.get('/property/:propertyId', getDemandsByProperty);

// Get all demands (filtered by role)
router.get('/', (req, res, next) => {
  console.log('🔍 Demand API - Get all demands called');
  console.log('👤 Demand API - Authenticated user:', {
    id: req.user?.id,
    role: req.user?.role,
    userType: req.user?.userType,
    employee_id: req.user?.employee_id
  });
  console.log('📋 Demand API - Query params:', req.query);
  next();
}, getAllDemands);

// Generate D2DC demand (Admin only) - Must be before /:id route
router.post('/d2dc', authorize('admin'), createD2DCDemand);

// Generate bulk demands (Admin only) - Must be before /:id route
router.post('/generate-bulk', authorize('admin'), generateBulkDemands);

// Generate combined demands (Property Tax + Water Tax) (Admin, Assessor)
router.post('/generate-combined', authorize('admin', 'assessor'), generateCombinedDemands);

// Generate unified demand (Property Tax + Water Tax in one demand) (Admin, Assessor)
router.post('/generate-unified', authorize('admin', 'assessor'), generateUnifiedDemand);

// Get demand by ID
router.get('/:id', getDemandById);

// Get unified demand breakdown
router.get('/:id/breakdown', getDemandBreakdown);

// Create single demand (Admin, Assessor)
router.post('/', authorize('admin', 'assessor'), createDemand);

// Calculate penalty for overdue demand (Admin, Cashier)
router.put('/:id/calculate-penalty', authorize('admin', 'cashier'), calculatePenalty);

export default router;
