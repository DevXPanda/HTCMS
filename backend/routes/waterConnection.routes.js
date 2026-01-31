import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createWaterConnection,
  updateWaterConnection,
  getAllWaterConnections,
  getWaterConnectionById,
  getWaterConnectionsByProperty
} from '../controllers/waterConnection.controller.js';

const router = express.Router();

// All routes require authentication (no role checks as per requirements)
router.use(authenticate);

// Get all water connections (with filters)
router.get('/', getAllWaterConnections);

// Get water connections by property
router.get('/property/:propertyId', getWaterConnectionsByProperty);

// Get water connection by ID
router.get('/:id', getWaterConnectionById);

// Create water connection
router.post('/', createWaterConnection);

// Update water connection
router.put('/:id', updateWaterConnection);

export default router;
