import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { authenticate, authorize } from '../middleware/enhancedAuth.js';
import {
  getAttendanceRecords,
  getAttendanceById,
  getAttendanceStats,
  markWorkerAttendance,
  markAllWorkersPresent,
  getWorkerAttendanceReports
} from '../controllers/attendance.controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const workerAttendanceDir = path.join(__dirname, '../uploads/worker-attendance');
if (!fs.existsSync(workerAttendanceDir)) {
  fs.mkdirSync(workerAttendanceDir, { recursive: true });
}

const workerAttendanceUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, workerAttendanceDir),
    filename: (req, file, cb) => {
      const ext = (path.extname(file.originalname) || '').toLowerCase() || '.jpg';
      const safe = /^\.(jpe?g|png|gif|webp)$/.test(ext) ? ext : '.jpg';
      cb(null, `att-${Date.now()}-${Math.round(Math.random() * 1e9)}${safe}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
  }
});

// All routes require authentication
router.use(authenticate);

// Mark worker attendance (SUPERVISOR only, multipart: photo + fields)
router.post('/mark', workerAttendanceUpload.single('photo'), markWorkerAttendance);

// Mark all workers present (SUPERVISOR only, bulk operation)
router.post('/mark-all', markAllWorkersPresent);

// Get attendance statistics (Admin, Assessor only)
router.get('/stats/summary', authorize('admin', 'assessor'), getAttendanceStats);

// Get worker attendance reports grouped by ULB (Admin, Assessor, EO)
router.get('/worker/reports', (req, res, next) => {
  // Allow admin, assessor, or eo roles
  if (req.user && (req.user.role === 'admin' || req.user.role === 'assessor' || req.user.role === 'eo')) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied. Admin, Assessor, or EO role required.' });
}, getWorkerAttendanceReports);

// Get attendance records (role-based access)
router.get('/', (req, res, next) => {

  next();
}, getAttendanceRecords);

// Get attendance record by ID (role-based access)
router.get('/:id', getAttendanceById);

export default router;
