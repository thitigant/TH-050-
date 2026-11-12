import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/db/prisma.js';
import { signToken } from '../src/utils/jwt.js';

describe('F-02 Server-Side Role and Ownership Authorization Guards', () => {
  let owner1Token: string;
  let owner2Token: string;
  let student1Token: string;
  let student2Token: string;
  let owner1SurveyId: string;
  let student1ResponseId: string;

  beforeAll(async () => {
    // 1. Fetch seeded accounts
    const owner1 = await prisma.user.findUnique({ where: { email: 'owner1@unipulse.edu' } });
    const owner2 = await prisma.user.findUnique({ where: { email: 'owner2@unipulse.edu' } });
    const student1 = await prisma.user.findUnique({ where: { email: 'student1@unipulse.edu' } });
    const student2 = await prisma.user.findUnique({ where: { email: 'student2@unipulse.edu' } });

    if (!owner1 || !owner2 || !student1 || !student2) {
      throw new Error('Required seed accounts missing. Run db:seed before running tests.');
    }

    owner1Token = signToken(owner1).token;
    owner2Token = signToken(owner2).token;
    student1Token = signToken(student1).token;
    student2Token = signToken(student2).token;

    // 2. Create test survey owned by owner1
    const survey = await prisma.survey.create({
      data: {
        id: 'srv_test_auth_guard_1',
        title: 'Auth Guard Test Survey',
        description: 'Testing description',
        ownerId: owner1.id,
        status: 'PUBLISHED',
        updatedAt: new Date(),
      },
    });
    owner1SurveyId = survey.id;

    // 3. Create test response submitted by student1
    const testResponse = await prisma.response.create({
      data: {
        id: 'rsp_test_auth_guard_1',
        surveyId: owner1SurveyId,
        respondentId: student1.id,
      },
    });
    student1ResponseId = testResponse.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.response.deleteMany({ where: { id: student1ResponseId } });
    await prisma.survey.deleteMany({ where: { id: owner1SurveyId } });
    await prisma.$disconnect();
  });

  describe('requireAuth Middleware', () => {
    it('TEST-07 (AC-07): should reject unauthenticated request with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/owner/protected');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('requireRole Guard (RBAC)', () => {
    it('TEST-08 (AC-08): should reject Respondent attempting to access Owner-only route with 403 FORBIDDEN_ROLE', async () => {
      const res = await request(app)
        .get('/api/owner/protected')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
      expect(res.body.error.message).toContain('SURVEY_OWNER');
    });

    it('TEST-09 (AC-09): should reject Survey Owner attempting to access Respondent-only route with 403 FORBIDDEN_ROLE', async () => {
      const res = await request(app)
        .get('/api/respondent/protected')
        .set('Authorization', `Bearer ${owner1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
      expect(res.body.error.message).toContain('RESPONDENT');
    });

    it('should grant access when user role matches requirement', async () => {
      const res = await request(app)
        .get('/api/owner/protected')
        .set('Authorization', `Bearer ${owner1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('Owner access granted');
    });
  });

  describe('Data Isolation and Scoped Ownership Queries', () => {
    it('should allow Survey Owner to access their own survey record', async () => {
      const res = await request(app)
        .get(`/api/owner/surveys/${owner1SurveyId}`)
        .set('Authorization', `Bearer ${owner1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(owner1SurveyId);
    });

    it('TEST-10 (AC-10): should return 404 when Survey Owner queries a survey owned by another owner', async () => {
      // Owner 2 tries to access Owner 1's survey
      const res = await request(app)
        .get(`/api/owner/surveys/${owner1SurveyId}`)
        .set('Authorization', `Bearer ${owner2Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('SURVEY_NOT_FOUND');
    });

    it('should allow Respondent to access their own response receipt', async () => {
      const res = await request(app)
        .get(`/api/respondent/responses/${student1ResponseId}`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(student1ResponseId);
    });

    it('TEST-23 (AC-23): should return 404 when Respondent queries response submitted by another respondent', async () => {
      // Student 2 tries to access Student 1's response
      const res = await request(app)
        .get(`/api/respondent/responses/${student1ResponseId}`)
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('RESPONSE_NOT_FOUND');
    });
  });
});
