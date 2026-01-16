import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload, uploadPropertyPhoto, uploadFieldVisitPhoto } from '../controllers/upload.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Upload property photo (Admin, Assessor, Collector)
router.post('/property-photo', authorize('admin', 'assessor', 'collector'), upload.single('photo'), uploadPropertyPhoto);

// Upload field visit photo (Collector only)
router.post('/field-visit-photo', authorize('collector'), upload.single('photo'), uploadFieldVisitPhoto);

export default router;
