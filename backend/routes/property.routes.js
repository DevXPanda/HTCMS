import express from 'express';
import { authenticate, authorize } from '../middleware/enhancedAuth.js';
import {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  searchProperties,
  getPropertiesByWard
} from '../controllers/property.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all properties (filtered by role)
router.get('/', getAllProperties);

// Advanced search
router.get('/search', searchProperties);

// Get properties by ward
router.get('/ward/:wardId', getPropertiesByWard);

// Get property by ID
router.get('/:id', getPropertyById);

// Create property (Admin, Assessor, Tax Collector)
router.post('/', authorize('admin', 'assessor', 'tax_collector'), createProperty);

// Update property (Admin, Assessor)
router.put('/:id', authorize('admin', 'assessor'), updateProperty);

// Delete property (Admin only)
router.delete('/:id', authorize('admin'), deleteProperty);

export default router;
