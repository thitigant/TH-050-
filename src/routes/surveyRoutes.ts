import { Router } from 'express';
import { surveyController } from '../controllers/surveyController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { Role } from '@prisma/client';

const router = Router();

// Survey Owner only routes
router.post('/', requireAuth, requireRole(Role.SURVEY_OWNER), (req, res, next) =>
  surveyController.createSurvey(req, res, next)
);

router.get('/', requireAuth, requireRole(Role.SURVEY_OWNER), (req, res, next) =>
  surveyController.getMySurveys(req, res, next)
);

// Detail route
router.get('/:id', requireAuth, (req, res, next) =>
  surveyController.getSurvey(req, res, next)
);

export default router;
