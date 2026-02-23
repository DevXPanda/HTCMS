import express from 'express';
import { authenticate } from '../middleware/enhancedAuth.js';
import {
    getAllFeedback,
    submitFeedback
} from '../controllers/feedback.controller.js';

const router = express.Router();

router.get('/', authenticate, getAllFeedback);
router.post('/', submitFeedback); // Public feedback allowed (optionally authenticated)

export default router;
