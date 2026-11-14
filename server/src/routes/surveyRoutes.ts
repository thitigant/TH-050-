import { Router } from 'express';
import { surveyController } from '../controllers/surveyController.js';
import { responseController } from '../controllers/responseController.js';
import { analyticsController } from '../controllers/analyticsController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { Role } from '@prisma/client';

const router = Router();

// Survey Owner only routes
router.post('/', requireAuth, requireRole(Role.SURVEY_OWNER), (req, res, next) =>
  surveyController.createSurvey(req, res, next)
);

// List surveys route (Owners get their own surveys; Respondents get published catalog with hasSubmitted flag)
router.get('/', requireAuth, (req, res, next) =>
  surveyController.getSurveys(req, res, next)
);

// Detail route
router.get('/:id', requireAuth, (req, res, next) =>
  surveyController.getSurvey(req, res, next)
);

// Lifecycle routes (Publish & Close)
router.post('/:id/publish', requireAuth, requireRole(Role.SURVEY_OWNER), (req, res, next) =>
  surveyController.publishSurvey(req, res, next)
);

router.post('/:id/close', requireAuth, requireRole(Role.SURVEY_OWNER), (req, res, next) =>
  surveyController.closeSurvey(req, res, next)
);

// Response Submission & Receipt routes (F-06 & F-07)
router.post('/:id/responses', requireAuth, (req, res, next) =>
  responseController.submitResponse(req, res, next)
);

router.get('/:id/responses/me', requireAuth, (req, res, next) =>
  responseController.getMyResponse(req, res, next)
);

// Aggregate Analytics & Summary routes (F-08 / F-12)
router.get('/:id/analytics', requireAuth, requireRole(Role.SURVEY_OWNER), (req, res, next) =>
  analyticsController.getSurveySummary(req, res, next)
);

router.get('/:id/summary', requireAuth, requireRole(Role.SURVEY_OWNER), (req, res, next) =>
  analyticsController.getSurveySummary(req, res, next)
);

export default router;
