import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { getDashboard } from '../controllers/sfi.controller.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('SFI'));

router.get('/dashboard', getDashboard);

export default router;
