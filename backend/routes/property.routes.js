import express from 'express';
import { authenticate, authorize } from '../middleware/enhancedAuth.js';
import {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  searchProperties,
  getPropertiesByWard,
  getOwnerByPhone
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

// Lookup owner by phone (for Add Property auto-fill) - must be before /:id
router.get('/owner-by-phone', authorize('admin', 'assessor', 'tax_collector'), getOwnerByPhone);

// Get property by ID
router.get('/:id', getPropertyById);

// Create property (Admin, Assessor, Tax Collector)
router.post('/', authorize('admin', 'assessor', 'tax_collector'), createProperty);

// Update property (Admin, Assessor)
router.put('/:id', authorize('admin', 'assessor'), updateProperty);

// Delete property (Admin only)
router.delete('/:id', authorize('admin'), deleteProperty);

export default router;
