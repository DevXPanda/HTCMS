import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  generateNotice,
  getAllNotices,
  getNoticeById,
  sendNotice,
  escalateNotice,
  generateNoticePdf,
  downloadNoticePdf
} from '../controllers/notice.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// PDF routes (must be before /:id)
router.get('/pdfs/:filename', downloadNoticePdf);

// Admin/Assessor routes
// Generate notice (Admin, Assessor only - Collector has NO access)
router.post('/generate', authorize('admin', 'assessor'), generateNotice);

// List all notices (Admin, Assessor, SBM read-only)
router.get('/', authorize('admin', 'assessor', 'SBM'), getAllNotices);

// Get notice by ID (Admin, Assessor, SBM read-only)
router.get('/:id', authorize('admin', 'assessor', 'SBM'), getNoticeById);

// Generate notice PDF (Admin, Assessor, Citizen - own notices)
router.post('/:id/generate-pdf', generateNoticePdf);

// Send notice (Admin, Assessor)
router.post('/:id/send', authorize('admin', 'assessor'), sendNotice);

// Escalate notice (Admin, Assessor)
router.post('/:id/escalate', authorize('admin', 'assessor'), escalateNotice);

export default router;
