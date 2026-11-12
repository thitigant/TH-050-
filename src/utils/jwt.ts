import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JwtPayload } from '../types/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-unipulse-course-testing';
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
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
