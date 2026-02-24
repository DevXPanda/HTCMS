import express from 'express';
import { authenticate, authorize } from '../middleware/enhancedAuth.js';
import {
    getAllFacilities,
    getFacilityById,
    createFacility,
    updateFacility,
    deleteFacility,
    getAllInspections,
    getInspectionById,
    createInspection,
    updateInspection,
    getAllMaintenanceRecords,
    createMaintenanceRecord,
    getAllComplaints,
    createComplaint,
    updateComplaint,
    getComplaintById,
    getCitizenComplaints,
    getAssignedComplaints,
    deleteComplaint,
    getReports,
    getInspectors,
    getSupervisors
} from '../controllers/toilet.controller.js';

const router = express.Router();

router.use(authenticate);

// Apply ULB filter to all routes for proper data isolation
import { ulbFilter } from '../middleware/ulbFilter.js';
router.use(ulbFilter);

// Facilities
router.get('/facilities', getAllFacilities);
router.get('/facilities/:id', getFacilityById);
router.get('/inspectors', getInspectors);
router.get('/supervisors', getSupervisors);
router.post('/facilities', authorize('admin'), createFacility);
router.put('/facilities/:id', authorize('admin'), updateFacility);
router.delete('/facilities/:id', authorize('admin'), deleteFacility);

// Inspections
router.get('/inspections', getAllInspections);
router.get('/inspections/:id', getInspectionById);
router.post('/inspections', authorize('admin', 'inspector'), createInspection);
router.put('/inspections/:id', authorize('admin', 'inspector'), updateInspection);

// Maintenance
router.get('/maintenance', getAllMaintenanceRecords);
router.post('/maintenance', authorize('admin'), createMaintenanceRecord);

// Complaints
router.get('/complaints', getAllComplaints);
router.get('/complaints/citizen', getCitizenComplaints); // Citizen history
router.get('/complaints/assigned/:supervisorId', getAssignedComplaints); // Supervisor view
router.get('/complaints/:id', getComplaintById);
router.post('/complaints', createComplaint);
router.put('/complaints/:id', authorize('admin', 'supervisor'), updateComplaint);
router.delete('/complaints/:id', authorize('admin'), deleteComplaint);

// Reports
router.get('/reports/stats', getReports);

export default router;
