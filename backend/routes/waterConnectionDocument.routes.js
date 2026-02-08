import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../controllers/upload.controller.js';
import {
  uploadDocument,
  uploadDocumentForRequest,
  getDocuments,
  getDocumentById,
  deleteDocument,
  checkMandatoryDocuments
} from '../controllers/waterConnectionDocument.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Configure multer for document uploads (allow PDFs and images)
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `water-doc-${name}-${uniqueSuffix}${ext}`);
  }
});

const documentFileFilter = (req, file, cb) => {
  // Allow PDFs and images
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPEG, PNG, GIF, and WebP files are allowed.'), false);
  }
};

const documentUpload = multer({
  storage: documentStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for documents
  },
  fileFilter: documentFileFilter
});

// Check mandatory documents (must be before /:id route)
router.get('/mandatory/check', checkMandatoryDocuments);

// Get all documents for a water connection
router.get('/', getDocuments);

// Upload document (must be before /:id route)
router.post('/', documentUpload.single('file'), uploadDocument);

// Upload document for water connection request (before connection exists)
router.post('/upload', documentUpload.single('file'), uploadDocumentForRequest);

// Get document by ID
router.get('/:id', getDocumentById);

// Delete document
router.delete('/:id', deleteDocument);

export default router;
