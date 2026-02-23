import express from 'express';
import { authenticate, authorize } from '../middleware/enhancedAuth.js';
import {
    getAllFacilities,
    getFacilityById,
    createFacility,
    getAllCattle,
    createCattle,
    getAllFeedingRecords,
    createFeedingRecord,
    getAllInspections,
    createInspection,
    getAllComplaints,
    createComplaint,
    getReports,
    getCattleMedicalRecords,
    createMedicalRecord
} from '../controllers/gauShala.controller.js';

const router = express.Router();

router.use(authenticate);

// Facilities
router.get('/facilities', getAllFacilities);
router.get('/facilities/:id', getFacilityById);
router.post('/facilities', authorize('admin'), createFacility);

// Cattle
router.get('/cattle', getAllCattle);
router.post('/cattle', authorize('admin'), createCattle);

// Feeding Records
router.get('/feeding-records', getAllFeedingRecords);
router.post('/feeding-records', authorize('admin'), createFeedingRecord);

// Inspections
router.get('/inspections', getAllInspections);
router.post('/inspections', authorize('admin', 'inspector'), createInspection);

// Complaints
router.get('/complaints', getAllComplaints);
router.post('/complaints', createComplaint);

// Reports
router.get('/reports/stats', getReports);

// Medical Records
router.get('/cattle/:cattle_id/medical', getCattleMedicalRecords);
router.post('/medical', authorize('admin'), createMedicalRecord);

export default router;
