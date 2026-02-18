import express from 'express';
import { authenticate, requireAdmin } from '../middleware/enhancedAuth.js';
import {
  getAlerts,
  getAlertStats,
  acknowledgeAlert,
  triggerAlertCheck
} from '../controllers/alert.controller.js';

const router = express.Router();

router.use(authenticate);

const requireEoOrAdmin = (req, res, next) => {
  const isEo = req.userType === 'admin_management' && req.user?.role === 'eo';
  const isAdmin = req.userType === 'user' && req.user?.role === 'admin';
  if (isEo || isAdmin) return next();
  return res.status(403).json({ message: 'EO or Admin access required' });
};

router.get('/', requireEoOrAdmin, getAlerts);
router.get('/stats', requireEoOrAdmin, getAlertStats);
router.patch('/:id/acknowledge', requireEoOrAdmin, acknowledgeAlert);

router.post('/trigger-check', requireAdmin, triggerAlertCheck);

export default router;
