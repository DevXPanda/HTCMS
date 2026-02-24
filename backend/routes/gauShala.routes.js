import express from 'express';
import { authenticate, authorize } from '../middleware/enhancedAuth.js';
import {
    getAllFacilities,
    getFacilityById,
    createFacility,
    updateFacility,
    deleteFacility,
    getAllCattle,
    createCattle,
    updateCattle,
    deleteCattle,
    getAllFeedingRecords,
    createFeedingRecord,
    getAllInspections,
    getInspectionById,
    createInspection,
    updateInspection,
    getAllComplaints,
    createComplaint,
    updateComplaint,
    deleteComplaint,
    getReports,
    getCattleMedicalRecords,
    createMedicalRecord,
    updateMedicalRecord,
    deleteMedicalRecord
} from '../controllers/gauShala.controller.js';

const router = express.Router();

router.use(authenticate);

// Facilities
router.get('/facilities', getAllFacilities);
router.get('/facilities/:id', getFacilityById);
router.post('/facilities', authorize('admin'), createFacility);
router.put('/facilities/:id', authorize('admin'), updateFacility);
router.delete('/facilities/:id', authorize('admin'), deleteFacility);

// Cattle
router.get('/cattle', getAllCattle);
router.get('/facilities/:id/cattle', (req, res, next) => {
    req.query.facility_id = req.params.id;
    getAllCattle(req, res, next);
});
router.post('/cattle', authorize('admin'), createCattle);
router.post('/facilities/:id/cattle', authorize('admin'), createCattle); // Support nested frontend call
router.put('/cattle/:id', authorize('admin'), updateCattle);
router.delete('/cattle/:id', authorize('admin'), deleteCattle);

// Feeding Records
router.get('/feeding-records', getAllFeedingRecords);
router.post('/feeding-records', authorize('admin'), createFeedingRecord);

// Inspections
router.get('/inspections', getAllInspections);
router.get('/inspections/:id', getInspectionById);
router.post('/inspections', authorize('admin', 'inspector'), createInspection);
router.put('/inspections/:id', authorize('admin', 'inspector'), updateInspection);

// Complaints
router.get('/complaints', getAllComplaints);
router.post('/complaints', createComplaint);
router.put('/complaints/:id', authorize('admin'), updateComplaint);
router.delete('/complaints/:id', authorize('admin'), deleteComplaint);

// Reports
router.get('/reports/stats', getReports);

// Medical Records
router.get('/cattle/:cattle_id/medical', getCattleMedicalRecords);
router.post('/medical', authorize('admin'), createMedicalRecord);
router.put('/medical/:id', authorize('admin'), updateMedicalRecord);
router.delete('/medical/:id', authorize('admin'), deleteMedicalRecord);

export default router;
