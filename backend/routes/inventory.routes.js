import express from 'express';
import { authenticate, authorize } from '../middleware/enhancedAuth.js';
import {
    getAllItems,
    createItem,
    getAllTransactions,
    recordTransaction
} from '../controllers/inventory.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/items', getAllItems);
router.post('/items', authorize('admin'), createItem);
router.get('/transactions', getAllTransactions);
router.post('/transactions', recordTransaction);

export default router;
