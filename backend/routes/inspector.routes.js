import express from 'express';
import { authenticateEmployee, requireWardAccess, requireSpecificWardAccess } from '../middleware/enhancedAuth.js';
import {
  getDashboardStats,
  getPendingPropertyApplications,
  getPendingWaterConnectionRequests,
  getPropertyApplicationForInspection,
  getWaterConnectionRequestForInspection,
  processPropertyInspection,
  processWaterInspection,
  getRecentInspections,
  getWardProperties,
  getPropertyDetails,
  getPropertyWaterConnections,
  inspectionValidation
} from '../controllers/inspector.controller.js';

const router = express.Router();

// All routes require employee authentication and ward access
router.use(authenticateEmployee);
router.use(requireWardAccess);

// Dashboard routes
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/recent-inspections', getRecentInspections);

// Property application inspection routes
router.get('/property-applications/pending', getPendingPropertyApplications);
router.get('/property-applications/:id/inspection', requireSpecificWardAccess('id'), getPropertyApplicationForInspection);
router.post('/property-applications/:id/inspect', requireSpecificWardAccess('id'), inspectionValidation, processPropertyInspection);

// Water connection request inspection routes
router.get('/water-connections/pending', getPendingWaterConnectionRequests);
router.get('/water-connections/:id/inspection', getWaterConnectionRequestForInspection);
router.post('/water-connections/:id/inspect', inspectionValidation, processWaterInspection);

// Properties inspection routes (read-only)
router.get('/properties', getWardProperties);
router.get('/properties/:id', getPropertyDetails); // Remove requireSpecificWardAccess - handled in controller
router.get('/properties/:id/water-connections', getPropertyWaterConnections); // Remove requireSpecificWardAccess - handled in controller

// Recent inspections route
router.get('/recent-inspections', getRecentInspections);

export default router;
