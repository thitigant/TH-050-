import { Role } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
  jti: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}
