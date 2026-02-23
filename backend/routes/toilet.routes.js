import express from 'express';
import { authenticate, authorize } from '../middleware/enhancedAuth.js';
import {
    getAllFacilities,
    getFacilityById,
    createFacility,
    updateFacility,
    deleteFacility,
    getAllInspections,
    createInspection,
    getAllMaintenanceRecords,
    createMaintenanceRecord,
    getAllComplaints,
    createComplaint,
    updateComplaint,
    getReports
} from '../controllers/toilet.controller.js';

const router = express.Router();

router.use(authenticate);

// Facilities
router.get('/facilities', getAllFacilities);
router.get('/facilities/:id', getFacilityById);
router.post('/facilities', authorize('admin'), createFacility);
router.put('/facilities/:id', authorize('admin'), updateFacility);
router.delete('/facilities/:id', authorize('admin'), deleteFacility);

// Inspections
router.get('/inspections', getAllInspections);
router.post('/inspections', authorize('admin', 'inspector'), createInspection);

// Maintenance
router.get('/maintenance', getAllMaintenanceRecords);
router.post('/maintenance', authorize('admin'), createMaintenanceRecord);

// Complaints
router.get('/complaints', getAllComplaints);
router.post('/complaints', createComplaint); // Allow anyone authenticated to file a complaint
router.put('/complaints/:id', authorize('admin'), updateComplaint);

// Reports
router.get('/reports/stats', getReports);

export default router;
