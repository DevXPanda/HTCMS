import { Router } from 'express';
import { authenticate } from '../middleware/enhancedAuth.js';
import { globalSearch } from '../controllers/globalSearch.controller.js';

const router = Router();

router.get('/', authenticate, globalSearch);

export default router;
