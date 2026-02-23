import express from 'express';
import { authenticate, authorize } from '../middleware/enhancedAuth.js';
import {
    getAllFacilities,
    getFacilityById,
    createFacility,
    updateFacility,
    deleteFacility,
    getReports,
    getAllSales,
    createSale
} from '../controllers/mrf.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/facilities', getAllFacilities);
router.get('/facilities/:id', getFacilityById);
router.post('/facilities', authorize('admin'), createFacility);
router.put('/facilities/:id', authorize('admin'), updateFacility);
router.delete('/facilities/:id', authorize('admin'), deleteFacility);

// Reports
router.get('/reports/stats', getReports);

// Sales
router.get('/sales', getAllSales);
router.post('/sales', authorize('admin'), createSale);

export default router;
