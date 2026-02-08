import express from 'express';
import { body } from 'express-validator';
import {
  getDashboard,
  getEscalatedPropertyApplications,
  getEscalatedWaterRequests,
  decidePropertyApplication,
  decideWaterRequest,
  getDecisionHistory
} from '../controllers/officer.controller.js';
import { authenticateEmployee, requireWardAccess } from '../middleware/enhancedAuth.js';

const router = express.Router();

// All officer routes require employee authentication (officers have full ward access)
router.use(authenticateEmployee);
router.use(requireWardAccess); // Officers get full access through the middleware logic

// Dashboard
router.get('/dashboard', getDashboard);

// Escalated applications
router.get('/property-applications/escalated', getEscalatedPropertyApplications);
router.get('/water-requests/escalated', getEscalatedWaterRequests);

// Decision making
router.post('/property-applications/:id/decide',
  [
    body('decision')
      .isIn(['APPROVE', 'REJECT', 'SEND_BACK'])
      .withMessage('Decision must be APPROVE, REJECT, or SEND_BACK'),
    body('officerRemarks')
      .if((value, { req }) => req.body.decision !== 'APPROVE')
      .notEmpty()
      .withMessage('Officer remarks required for REJECT and SEND_BACK decisions')
  ],
  decidePropertyApplication
);

router.post('/water-requests/:id/decide',
  [
    body('decision')
      .isIn(['APPROVE', 'REJECT', 'SEND_BACK'])
      .withMessage('Decision must be APPROVE, REJECT, or SEND_BACK'),
    body('officerRemarks')
      .if((value, { req }) => req.body.decision !== 'APPROVE')
      .notEmpty()
      .withMessage('Officer remarks required for REJECT and SEND_BACK decisions')
  ],
  decideWaterRequest
);

// Decision history
router.get('/decisions/history', getDecisionHistory);

export default router;
