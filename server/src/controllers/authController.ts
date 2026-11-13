import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from '../services/authService.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export class AuthController {
  async login(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: {
            code: 'INVALID_PAYLOAD',
            message: 'Validation failed',
            details: parsed.error.format(),
          },
        });
        return;
      }

      const { email, password } = parsed.data;
      const result = await authService.login(email, password);

      res.status(200).json({
        data: result,
      });
    } catch (error: any) {
      if (error.statusCode) {
        res.status(error.statusCode).json({
          error: {
            code: error.code || 'AUTHENTICATION_ERROR',
            message: error.message,
          },
        });
        return;
      }
      next(error);
    }
  }

  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
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

      const result = await authService.logout(req.user.id, req.user.jti);
      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async me(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
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

      const user = await authService.getCurrentUser(req.user.id);
      res.status(200).json({
        data: user,
      });
    } catch (error: any) {
      if (error.statusCode) {
        res.status(error.statusCode).json({
          error: {
            code: error.code || 'USER_ERROR',
            message: error.message,
          },
        });
        return;
      }
      next(error);
    }
  }
}

export const authController = new AuthController();

