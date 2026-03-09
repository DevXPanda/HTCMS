import express from 'express';
import { authenticate } from '../middleware/enhancedAuth.js';
import { getMyNotifications, markAsRead, markAllAsRead } from '../controllers/notification.controller.js';

const router = express.Router();
router.use(authenticate);

router.get('/', getMyNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);

export default router;
