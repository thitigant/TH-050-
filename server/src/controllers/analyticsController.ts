import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { analyticsService } from '../services/analyticsService.js';
import { handleControllerError } from '../utils/errors.js';

export class AnalyticsController {
  async getSurveySummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const surveyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const summary = await analyticsService.getSurveySummary(surveyId, req.user!.id);

      res.status(200).json({
        data: summary,
      });
    } catch (error) {
      handleControllerError(error, res, next, 'ANALYTICS_ERROR');
    }
  }
}

export const analyticsController = new AnalyticsController();
