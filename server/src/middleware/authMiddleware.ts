import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';
import { prisma } from '../db/prisma.js';
import { Role } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
    jti: string;
    rawToken: string;
  };
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token required',
      },
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyToken(token);

    // Check if token has been revoked in RevokedToken table
    const revoked = await prisma.revokedToken.findUnique({
      where: { jti: payload.jti },
    });

    if (revoked) {
      res.status(401).json({
        error: {
          code: 'TOKEN_REVOKED',
          message: 'Token has been revoked upon logout',
        },
      });
      return;
    }

    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      jti: payload.jti,
      rawToken: token,
    };

    next();
  } catch (error: any) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired authentication token',
      },
    });
  }
}

// Course-spec naming alias
export const requireAuth = authenticateToken;

/**
 * Middleware guard to enforce role-based access control (RBAC).
 * Returns HTTP 403 with code 'FORBIDDEN_ROLE' if user's role is not allowed.
 */
export function requireRole(...roles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN_ROLE',
          message: `Access denied. Requires one of the following roles: ${roles.join(', ')}`,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Data isolation query helper for Survey Owners.
 * Scopes survey lookup by ownerId. If survey belongs to another owner or does not exist,
 * returns null (enabling controller to return 404 to avoid leaking record existence).
 */
export async function findOwnedSurvey(surveyId: string, ownerId: string) {
  return prisma.survey.findFirst({
    where: {
      id: surveyId,
      ownerId,
    },
  });
}

/**
 * Data isolation query helper for Respondents.
 * Scopes response lookup by respondentId. If response belongs to another respondent or does not exist,
 * returns null (enabling controller to return 404 to avoid leaking record existence).
 */
export async function findOwnedResponse(responseId: string, respondentId: string) {
  return prisma.response.findFirst({
    where: {
      id: responseId,
      respondentId,
    },
    include: {
      Answer: true,
      Survey: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
  });
}
