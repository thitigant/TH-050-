import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { submitResponseSchema } from '../validators/responseValidator.js';
import { responseService } from '../services/responseService.js';
import { handleControllerError } from '../utils/errors.js';

export class ResponseController {
  async submitResponse(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const surveyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const parsed = submitResponseSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: {
            code: 'INVALID_PAYLOAD',
            message: 'Validation failed for response submission',
            details: parsed.error.format(),
          },
        });
        return;
      }

      const result = await responseService.submitResponse(
        surveyId,
        req.user!.id,
        parsed.data.answers
      );

      res.status(201).json({
        data: result,
      });
    } catch (error) {
      handleControllerError(error, res, next, 'RESPONSE_ERROR');
    }
  }

  async getMyResponse(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const surveyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const response = await responseService.getMyResponseForSurvey(surveyId, req.user!.id);

      res.status(200).json({
        data: response,
      });
    } catch (error) {
      handleControllerError(error, res, next, 'RESPONSE_ERROR');
    }
  }

  async getResponseById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const responseId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const response = await responseService.getResponseById(responseId, req.user!.id);

      res.status(200).json({
        data: response,
      });
    } catch (error) {
      handleControllerError(error, res, next, 'RESPONSE_ERROR');
    }
  }
}

export const responseController = new ResponseController();
