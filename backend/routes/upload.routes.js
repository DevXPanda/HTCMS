import express from 'express';
import { authenticate, authorize } from '../middleware/enhancedAuth.js';
import { upload, uploadPropertyPhoto, uploadFieldVisitPhoto, uploadPaymentProof, uploadShopRegistrationDocument, uploadDiscountDocument, uploadPenaltyWaiverDocument } from '../controllers/upload.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Upload property photo (Admin, Assessor, Collector)
router.post('/property-photo', authorize('admin', 'assessor', 'collector'), upload.single('photo'), uploadPropertyPhoto);

// Upload field visit photo (Collector only)
router.post('/field-visit-photo', authorize('collector'), upload.single('photo'), uploadFieldVisitPhoto);

// Upload payment proof (Collector, Tax Collector)
router.post('/payment-proof', authorize('collector', 'tax_collector'), upload.single('proof'), uploadPaymentProof);

// Upload shop registration document (Citizen, Admin, Clerk)
router.post('/shop-registration-document', authorize('citizen', 'admin', 'clerk'), upload.single('file'), uploadShopRegistrationDocument);

// Upload discount application document - PDF only (Admin)
router.post('/discount-document', authorize('admin'), upload.single('document'), uploadDiscountDocument);

// Upload penalty waiver application document - PDF only (Admin)
router.post('/penalty-waiver-document', authorize('admin'), upload.single('document'), uploadPenaltyWaiverDocument);

export default router;
