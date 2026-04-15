import express from 'express';
import { askAI } from '../controllers/ai.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All AI routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/ai/ask
 * @desc    Ask the AI Assistant
 * @access  Private
 */
router.post('/ask', askAI);

export default router;
