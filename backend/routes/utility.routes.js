import express from 'express';
import { authenticate, authorize } from '../middleware/enhancedAuth.js';
import {
    getAllBills,
    recordBill,
    updateBillStatus
} from '../controllers/utility.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/bills', getAllBills);
router.post('/bills', authorize('admin'), recordBill);
router.put('/bills/:id/status', authorize('admin'), updateBillStatus);

export default router;
