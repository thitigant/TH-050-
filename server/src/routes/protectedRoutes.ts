import { Router, Response } from 'express';
import {
  requireAuth,
  requireRole,
  findOwnedSurvey,
  findOwnedResponse,
  AuthenticatedRequest,
} from '../middleware/authMiddleware.js';
import { Role } from '@prisma/client';

const router = Router();

// Test guard endpoints for role validation (sanitized payload, never echo rawToken or jti)
router.get(
  '/owner/protected',
  requireAuth,
  requireRole(Role.SURVEY_OWNER),
  (req: AuthenticatedRequest, res: Response) => {
    const { id, email, role } = req.user!;
    res.status(200).json({
      data: {
        message: 'Owner access granted',
        user: { id, email, role },
      },
    });
  }
);

router.get(
  '/respondent/protected',
  requireAuth,
  requireRole(Role.RESPONDENT),
  (req: AuthenticatedRequest, res: Response) => {
    const { id, email, role } = req.user!;
    res.status(200).json({
      data: {
        message: 'Respondent access granted',
        user: { id, email, role },
      },
    });
  }
);

// Scoped Survey Owner query endpoint (Data Isolation)
router.get(
  '/owner/surveys/:id',
  requireAuth,
  requireRole(Role.SURVEY_OWNER),
  async (req: AuthenticatedRequest, res: Response) => {
    const surveyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const survey = await findOwnedSurvey(surveyId, req.user!.id);
    if (!survey) {
      res.status(404).json({
        error: {
          code: 'SURVEY_NOT_FOUND',
          message: 'Survey not found',
        },
      });
      return;
    }
    res.status(200).json({ data: survey });
  }
);

// Scoped Respondent Response query endpoint (Data Isolation)
router.get(
  '/respondent/responses/:id',
  requireAuth,
  requireRole(Role.RESPONDENT),
  async (req: AuthenticatedRequest, res: Response) => {
    const responseId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const response = await findOwnedResponse(responseId, req.user!.id);
    if (!response) {
      res.status(404).json({
        error: {
          code: 'RESPONSE_NOT_FOUND',
          message: 'Response not found',
        },
      });
      return;
    }
    res.status(200).json({ data: response });
  }
);

export default router;
