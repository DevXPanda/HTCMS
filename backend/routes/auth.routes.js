import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
    register,
    login,
    logout,
    getMe,
    changePassword,
    verifyRegistration,
    resendRegistrationOtp,
    verifyCitizenLogin
} from '../controllers/auth.controller.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/verify-registration', verifyRegistration);
router.post('/resend-registration-otp', resendRegistrationOtp);
router.post('/login', login);
router.post('/verify-citizen-login', verifyCitizenLogin);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, changePassword);

export default router;
