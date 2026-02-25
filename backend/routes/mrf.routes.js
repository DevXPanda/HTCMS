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
    createSale,
    getWasteEntries,
    createWasteEntry,
    getAssignments,
    assignWorker,
    removeAssignment,
    getTasks,
    createTask,
    updateTaskStatus,
    getLinkedComplaints,
    exportWasteReport
} from '../controllers/mrf.controller.js';

const router = express.Router();

router.use(authenticate);

// Facility CRUD
router.get('/facilities', getAllFacilities);
router.get('/facilities/:id', getFacilityById);
router.post('/facilities', authorize('admin'), createFacility);
router.put('/facilities/:id', authorize('admin'), updateFacility);
router.delete('/facilities/:id', authorize('admin'), deleteFacility);

// Waste Entries
router.get('/waste-entries', getWasteEntries);
router.post('/waste-entries', authorize('admin', 'supervisor'), createWasteEntry);

// Worker Assignments
router.get('/assignments', getAssignments);
router.post('/assignments', authorize('admin'), assignWorker);
router.patch('/assignments/:id/deactivate', authorize('admin'), removeAssignment);

// Tasks
router.get('/tasks', getTasks);
router.post('/tasks', authorize('admin', 'supervisor'), createTask);
router.patch('/tasks/:id/status', updateTaskStatus);

// Complaints
router.get('/facilities/:id/complaints', getLinkedComplaints);

// Reports
router.get('/reports/stats', getReports);
router.get('/reports/export', authorize('admin'), exportWasteReport);

// Sales
router.get('/sales', getAllSales);
router.post('/sales', authorize('admin'), createSale);

export default router;
