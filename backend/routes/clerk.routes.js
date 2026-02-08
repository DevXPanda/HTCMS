import express from 'express';
import { authenticateEmployee, requireWardAccess, requireSpecificWardAccess } from '../middleware/enhancedAuth.js';
import {
    getClerkDashboard,
    getWaterApplications,
    getWaterApplicationById,
    createWaterApplication,
    updateWaterApplication,
    submitWaterApplication,
    processWaterApplication,
    deleteWaterApplication,
    getExistingWaterConnections
} from '../controllers/clerk.controller.js';

const router = express.Router();

// All routes require employee authentication and ward access
router.use(authenticateEmployee);
router.use(requireWardAccess);

// Clerk dashboard
router.get('/dashboard', getClerkDashboard);

// Water Connection Requests
router.get('/water-connection-requests', getWaterApplications);
router.get('/water-connection-requests/:id', requireSpecificWardAccess('id'), getWaterApplicationById);
router.post('/water-connection-requests', createWaterApplication);
router.put('/water-connection-requests/:id', requireSpecificWardAccess('id'), updateWaterApplication);
router.post('/water-connection-requests/:id/submit', requireSpecificWardAccess('id'), submitWaterApplication);
router.post('/water-connection-requests/:id/process', requireSpecificWardAccess('id'), processWaterApplication);
router.delete('/water-connection-requests/:id', requireSpecificWardAccess('id'), deleteWaterApplication);

// Existing Water Connections
router.get('/water-connections', getExistingWaterConnections);

export default router;
