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
router.post('/facilities', authorize('admin', 'sfi'), createFacility);
router.put('/facilities/:id', authorize('admin', 'sfi'), updateFacility);
router.delete('/facilities/:id', authorize('admin', 'sfi'), deleteFacility);

// Cattle
router.get('/cattle', getAllCattle);
router.get('/facilities/:id/cattle', (req, res, next) => {
    req.query.facility_id = req.params.id;
    getAllCattle(req, res, next);
});
router.post('/cattle', authorize('admin', 'sfi'), createCattle);
router.post('/facilities/:id/cattle', authorize('admin', 'sfi'), createCattle); // Support nested frontend call
router.put('/cattle/:id', authorize('admin', 'sfi'), updateCattle);
router.delete('/cattle/:id', authorize('admin', 'sfi'), deleteCattle);

// Feeding Records
router.get('/feeding-records', getAllFeedingRecords);
router.post('/feeding-records', authorize('admin', 'sfi'), createFeedingRecord);

// Inspections
router.get('/inspections', getAllInspections);
router.get('/inspections/:id', getInspectionById);
router.post('/inspections', authorize('admin', 'inspector', 'sfi'), createInspection);
router.put('/inspections/:id', authorize('admin', 'inspector', 'sfi'), updateInspection);

// Complaints
router.get('/complaints', getAllComplaints);
router.post('/complaints', createComplaint);
router.put('/complaints/:id', authorize('admin', 'sfi'), updateComplaint);
router.delete('/complaints/:id', authorize('admin', 'sfi'), deleteComplaint);

// Reports
router.get('/reports/stats', getReports);

// Medical Records
router.get('/cattle/:cattle_id/medical', getCattleMedicalRecords);
router.post('/medical', authorize('admin', 'sfi'), createMedicalRecord);
router.put('/medical/:id', authorize('admin', 'sfi'), updateMedicalRecord);
router.delete('/medical/:id', authorize('admin', 'sfi'), deleteMedicalRecord);

export default router;
