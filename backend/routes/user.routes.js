import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getCollectors
} from '../controllers/user.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Admin only routes
router.get('/', authorize('admin'), getAllUsers);
router.get('/collectors', authorize('admin'), getCollectors);
router.post('/', authorize('admin'), createUser);
router.put('/:id', updateUser); // Users can update their own profile
router.delete('/:id', authorize('admin'), deleteUser);

// Get user by ID (admin or own profile)
router.get('/:id', getUserById);

export default router;
