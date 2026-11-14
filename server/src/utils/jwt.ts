import 'dotenv/config';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JwtPayload } from '../types/auth.js';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is required but not set.');
  }
  return secret;
}

// Fail-fast validation at module initialization/startup
const JWT_SECRET = getJwtSecret();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '60m';

export function signToken(user: { id: string; email: string; role: any }): { token: string; jti: string; expiresAt: Date } {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      jti,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN as any,
    }
  );

  // 60 minutes from now
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  return { token, jti, expiresAt };
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as unknown as JwtPayload;
}
