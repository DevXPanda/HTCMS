import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authenticate } from '../middleware/enhancedAuth.js';
import { createTask, getTasks, updateTask } from '../controllers/workerTask.controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Setup upload directories
const taskPhotosDir = path.join(__dirname, '../uploads/task-photos');
if (!fs.existsSync(taskPhotosDir)) {
  fs.mkdirSync(taskPhotosDir, { recursive: true });
}

const taskPhotoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, taskPhotosDir),
    filename: (req, file, cb) => {
      const ext = (path.extname(file.originalname) || '').toLowerCase() || '.jpg';
      const safe = /^\.(jpe?g|png|gif|webp)$/.test(ext) ? ext : '.jpg';
      cb(null, `task-${Date.now()}-${Math.round(Math.random() * 1e9)}${safe}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
  }
});

router.use(authenticate);

// Create task
router.post('/', createTask);

// Get tasks (filtered by supervisor)
router.get('/', getTasks);

// Update task (with optional photo uploads)
router.put('/:id', taskPhotoUpload.fields([
  { name: 'before_photo', maxCount: 1 },
  { name: 'after_photo', maxCount: 1 }
]), async (req, res, next) => {
  // Add photo URLs to request body if uploaded
  if (req.files) {
    if (req.files.before_photo && req.files.before_photo[0]) {
      req.body.before_photo_url = `/uploads/task-photos/${req.files.before_photo[0].filename}`;
    }
    if (req.files.after_photo && req.files.after_photo[0]) {
      req.body.after_photo_url = `/uploads/task-photos/${req.files.after_photo[0].filename}`;
    }
  }
  next();
}, updateTask);

export default router;
