import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
    register,
    login,
    getMe,
    changePassword
} from '../controllers/auth.controller.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, changePassword);

export default router;
