import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { createSurveySchema } from '../validators/surveyValidator.js';
import { surveyService } from '../services/surveyService.js';

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

  async getMySurveys(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
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

      const surveys = await surveyService.getOwnerSurveys(req.user.id);
      res.status(200).json({
        data: surveys,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSurvey(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const surveyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const survey = await surveyService.getSurveyById(surveyId, req.user?.id);
      res.status(200).json({
        data: survey,
      });
    } catch (error: any) {
      if (error.statusCode) {
        res.status(error.statusCode).json({
          error: {
            code: error.code || 'SURVEY_ERROR',
            message: error.message,
          },
        });
        return;
      }
      next(error);
    }
  }
}

export const surveyController = new SurveyController();
