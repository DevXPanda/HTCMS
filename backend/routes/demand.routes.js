import express from 'express';
import { authenticate, authorize } from '../middleware/enhancedAuth.js';
import {
  getAllDemands,
  getDemandById,
  getDemandPdf,
  createDemand,
  createD2DCDemand,
  generateShopDemand,
  generateBulkDemands,
  generateBulkShopDemands,
  generateBulkWaterDemands,
  generatePropertyShopDemands,
  generateCombinedDemands,
  generateUnifiedDemand,
  calculatePenalty,
  getDemandsByProperty,
  getDemandsByModuleAndEntity,
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

// Get demands by module and entity (Admin only - for discount workflow)
router.get('/by-entity/:module/:entityId', authorize('admin'), getDemandsByModuleAndEntity);

// Get all demands (filtered by role)
router.get('/', (req, res, next) => {

  next();
}, getAllDemands);

// Generate D2DC demand (Admin only) - Must be before /:id route
router.post('/d2dc', authorize('admin'), createD2DCDemand);

// Generate shop tax demand (Admin, Assessor, Clerk) - idempotent
router.post('/generate-shop', authorize('admin', 'assessor', 'clerk'), generateShopDemand);

// Generate bulk demands (Admin only) - Must be before /:id route
router.post('/generate-bulk', authorize('admin'), generateBulkDemands);

// Generate bulk shop tax demands (Admin, Assessor, Clerk)
router.post('/generate-bulk-shop', authorize('admin', 'assessor', 'clerk'), generateBulkShopDemands);

// Generate bulk water tax demands (Admin, Assessor)
router.post('/generate-bulk-water', authorize('admin', 'assessor'), generateBulkWaterDemands);

// Generate shop demands for a single property (Admin, Assessor)
router.post('/generate-property-shop', authorize('admin', 'assessor'), generatePropertyShopDemands);

// Generate combined demands (Property Tax + Water Tax) (Admin, Assessor)
router.post('/generate-combined', authorize('admin', 'assessor'), generateCombinedDemands);

// Generate unified demand (Property Tax + Water Tax in one demand) (Admin, Assessor)
router.post('/generate-unified', authorize('admin', 'assessor'), generateUnifiedDemand);

// Get demand PDF (must be before /:id)
router.get('/:id/pdf', getDemandPdf);

// Get demand by ID
router.get('/:id', getDemandById);

// Get unified demand breakdown
router.get('/:id/breakdown', getDemandBreakdown);

// Create single demand (Admin, Assessor)
router.post('/', authorize('admin', 'assessor'), createDemand);

// Calculate penalty for overdue demand (Admin, Cashier)
router.put('/:id/calculate-penalty', authorize('admin', 'cashier'), calculatePenalty);

export default router;
