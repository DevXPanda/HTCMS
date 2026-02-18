import express from 'express';
import { requireAdmin, authenticate } from '../middleware/enhancedAuth.js';
import { getEoList, getEoDashboard, getEoDashboardForSelf, getSupervisorDashboardForSelf, getAdminFieldWorkerDashboard, getPayrollPreview } from '../controllers/fieldWorkerMonitoring.controller.js';

const requireEo = (req, res, next) => {
  // Normalize role to uppercase for comparison
  const normalizedRole = req.user?.role ? req.user.role.toUpperCase().replace(/-/g, '_') : null;
  if (req.userType !== 'admin_management' || normalizedRole !== 'EO') {
    return res.status(403).json({ success: false, message: 'EO role required' });
  }
  next();
};

const requireSupervisor = (req, res, next) => {
  // Normalize role to uppercase for comparison
  const normalizedRole = req.user?.role ? req.user.role.toUpperCase().replace(/-/g, '_') : null;
  if (req.userType !== 'admin_management' || normalizedRole !== 'SUPERVISOR') {
    return res.status(403).json({ success: false, message: 'SUPERVISOR role required' });
  }
  next();
};

/** Allow user table admin OR staff (admin_management) with admin/assessor/cashier for Field Worker Monitoring admin view */
const requireFieldWorkerMonitoringAdmin = (req, res, next) => {
  const isUserAdmin = req.userType === 'user' && req.user?.role === 'admin';
  const isStaffAllowed = req.userType === 'admin_management' && ['admin', 'assessor', 'cashier'].includes(req.user?.role);
  if (isUserAdmin || isStaffAllowed) return next();
  return res.status(403).json({ success: false, message: 'Access denied. Admin or staff role required.' });
};

const router = express.Router();

router.use(authenticate);

router.get('/eo-dashboard', requireEo, getEoDashboardForSelf);
router.get('/payroll-preview', requireEo, getPayrollPreview);
router.get('/supervisor-dashboard', requireSupervisor, getSupervisorDashboardForSelf);

router.use(requireFieldWorkerMonitoringAdmin);
router.get('/eos', getEoList);
router.get('/eos/:eoId/dashboard', getEoDashboard);
router.get('/admin-dashboard', getAdminFieldWorkerDashboard);

export default router;
