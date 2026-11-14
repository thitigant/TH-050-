import { Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function handleControllerError(
  error: unknown,
  res: Response,
  next: NextFunction,
  defaultCode = 'INTERNAL_SERVER_ERROR'
): void {
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
        code: err.code || defaultCode,
        message: err.message || 'An error occurred',
      },
    });
    return;
  }
  next(error);
}
