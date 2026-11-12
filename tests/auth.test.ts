import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/db/prisma.js';

describe('F-01 Authentication and Session Management', () => {
  let validToken: string;
  let userStudent: any;

  beforeAll(async () => {
    // Ensure seeded account exists
    userStudent = await prisma.user.findUnique({
      where: { email: 'student1@unipulse.edu' },
    });
    if (!userStudent) {
      throw new Error('Seed account student1@unipulse.edu not found. Run npm run db:seed first.');
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/auth/login', () => {
    it('TEST-01 (AC-01 & AC-02): should successfully authenticate with valid credentials and return JWT with role', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'student1@unipulse.edu',
          password: 'Password123!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toMatchObject({
        email: 'student1@unipulse.edu',
        role: 'RESPONDENT',
        name: 'Student Charlie',
      });
      // Store token for subsequent tests
      validToken = response.body.data.token;
    });

    it('TEST-02 (AC-02): should return generic 401 when password does not match', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'student1@unipulse.edu',
          password: 'WrongPassword999!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(response.body.error.message).toBe('Invalid email or password');
    });

    it('TEST-03 (AC-02): should return generic 401 when email is not registered', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@unipulse.edu',
          password: 'Password123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(response.body.error.message).toBe('Invalid email or password');
    });

    it('should return 400 when login payload is malformed', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'not-an-email',
          password: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_PAYLOAD');
    });
  });

  describe('GET /api/auth/me', () => {
    it('TEST-04 (AC-03): should return current user identity and role when bearer token is valid', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        email: 'student1@unipulse.edu',
        role: 'RESPONDENT',
        name: 'Student Charlie',
      });
    });

    it('TEST-05 (AC-03): should reject request without token with 401 UNAUTHORIZED', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject forged or corrupted token with 401 UNAUTHORIZED', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer forged-invalid-token-string');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('TEST-06 (AC-04): should revoke token in RevokedToken table and reject immediate reuse', async () => {
      // 1. Log in to get fresh token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'owner1@unipulse.edu',
          password: 'Password123!',
        });

      expect(loginRes.status).toBe(200);
      const ownerToken = loginRes.body.data.token;

      // 2. Verify token works
      const meBefore = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(meBefore.status).toBe(200);
      expect(meBefore.body.data.role).toBe('SURVEY_OWNER');

      // 3. Perform logout
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.data.message).toBe('Successfully logged out');

      // 4. Immediate reuse of the same token must be rejected with 401 TOKEN_REVOKED
      const meAfter = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(meAfter.status).toBe(401);
      expect(meAfter.body.error.code).toBe('TOKEN_REVOKED');
      expect(meAfter.body.error.message).toContain('revoked');
    });
  });
});
