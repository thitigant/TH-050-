import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { submitResponseSchema } from '../validators/responseValidator.js';
import { responseService } from '../services/responseService.js';
import { AppError } from '../utils/errors.js';

function handleControllerError(error: unknown, res: Response, next: NextFunction): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }
  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    const err = error as { statusCode: number; code?: string; message?: string };
    res.status(err.statusCode).json({
      error: {
        code: err.code || 'RESPONSE_ERROR',
        message: err.message || 'An error occurred',
      },
    });
    return;
  }
  next(error);
}

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
      handleControllerError(error, res, next);
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
      handleControllerError(error, res, next);
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
      handleControllerError(error, res, next);
    }
  }
}

export const responseController = new ResponseController();
