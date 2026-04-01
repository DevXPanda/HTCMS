import express from 'express';
import { authenticate, authorize } from '../middleware/enhancedAuth.js';
import { upload, uploadPropertyPhoto, uploadOwnerPhoto, uploadFieldVisitPhoto, uploadPaymentProof, uploadShopRegistrationDocument, uploadDiscountDocument, uploadPenaltyWaiverDocument, uploadToiletPhoto } from '../controllers/upload.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Upload property photo (Admin, Assessor, Collector)
router.post('/property-photo', authorize('admin', 'assessor', 'collector'), upload.single('photo'), uploadPropertyPhoto);

// Upload owner passport-size photo or PDF (all roles: citizen, collector, admin, clerk, assessor, tax_collector)
router.post('/owner-photo', authorize('admin', 'assessor', 'tax_collector', 'collector', 'clerk', 'citizen'), upload.single('photo'), uploadOwnerPhoto);

// Upload field visit photo (Collector only)
router.post('/field-visit-photo', authorize('collector'), upload.single('photo'), uploadFieldVisitPhoto);

// Upload payment proof (Admin, Cashier, Collector, Tax Collector)
router.post('/payment-proof', authorize('admin', 'cashier', 'collector', 'tax_collector'), upload.single('proof'), uploadPaymentProof);

// Upload shop registration document (Citizen, Admin, Clerk)
router.post('/shop-registration-document', authorize('citizen', 'admin', 'clerk'), upload.single('file'), uploadShopRegistrationDocument);

// Upload discount application document - PDF only (Admin)
router.post('/discount-document', authorize('admin', 'ACCOUNT_OFFICER'), upload.single('document'), uploadDiscountDocument);

// Upload penalty waiver application document - PDF only (Admin)
router.post('/penalty-waiver-document', authorize('admin', 'ACCOUNT_OFFICER'), upload.single('document'), uploadPenaltyWaiverDocument);

// Upload toilet module photos (Admin, Inspector, Citizen, Supervisor)
router.post('/toilet-photo', authorize('admin', 'inspector', 'citizen', 'supervisor'), upload.single('photo'), uploadToiletPhoto);

export default router;
