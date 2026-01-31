import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createMeterReading,
  getAllMeterReadings,
  getMeterReadingById,
  getMeterReadingsByConnection,
  getLastMeterReading
} from '../controllers/waterMeterReading.controller.js';

const router = express.Router();

// All routes require authentication (no role checks as per requirements)
router.use(authenticate);

// Get all meter readings (with filters)
router.get('/', getAllMeterReadings);

// Get last meter reading for a connection
router.get('/connection/:waterConnectionId/last', getLastMeterReading);

// Get meter readings by connection
router.get('/connection/:waterConnectionId', getMeterReadingsByConnection);

// Get meter reading by ID
router.get('/:id', getMeterReadingById);

// Create meter reading
router.post('/', createMeterReading);

export default router;
