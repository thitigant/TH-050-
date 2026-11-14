import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { createSurveySchema } from '../validators/surveyValidator.js';
import { surveyService } from '../services/surveyService.js';
import { AppError, handleControllerError } from '../utils/errors.js';
import { Role } from '@prisma/client';

export class SurveyController {
  async createSurvey(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      const parsed = createSurveySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: {
            code: 'INVALID_PAYLOAD',
            message: 'Validation failed for survey creation',
            details: parsed.error.format(),
          },
        });
        return;
      }

      const survey = await surveyService.createDraftSurvey(req.user.id, parsed.data);
      res.status(201).json({
        data: survey,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSurveys(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      let surveys;
      switch (req.user!.role) {
        case Role.RESPONDENT:
          surveys = await surveyService.getPublishedSurveysForRespondent(req.user!.id);
          break;
        case Role.SURVEY_OWNER:
          surveys = await surveyService.getOwnerSurveys(req.user!.id);
          break;
        default: {
          const _exhaustiveCheck: never = req.user!.role;
          throw new AppError(403, 'FORBIDDEN_ROLE', `Role '${_exhaustiveCheck}' is not authorized to list surveys`);
        }
      }

      res.status(200).json({
        data: surveys,
      });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  }

  async getSurvey(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const surveyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const survey = await surveyService.getSurveyById(surveyId, req.user?.id);
      res.status(200).json({
        data: survey,
      });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  }

  async publishSurvey(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const surveyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const survey = await surveyService.publishSurvey(surveyId, req.user!.id);
      res.status(200).json({ data: survey });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  }

  async closeSurvey(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const surveyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const survey = await surveyService.closeSurvey(surveyId, req.user!.id);
      res.status(200).json({ data: survey });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  }

  async deleteSurvey(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const surveyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await surveyService.deleteSurvey(surveyId, req.user!.id);
      res.status(200).json({ data: result });
    } catch (error) {
      handleControllerError(error, res, next);
    }
  }
}

export const surveyController = new SurveyController();
