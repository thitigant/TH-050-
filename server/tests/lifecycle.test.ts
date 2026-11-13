import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/db/prisma.js';
import { signToken } from '../src/utils/jwt.js';
import { SurveyStatus } from '@prisma/client';

describe('F-05 Survey Lifecycle Management (Publish & Close)', () => {
  let owner1Token: string;
  let owner2Token: string;
  let studentToken: string;
  let owner1Id: string;
  let owner2Id: string;

  let surveyWithQuestionsId: string;
  let surveyEmptyId: string;

  beforeAll(async () => {
    const owner1 = await prisma.user.findUnique({ where: { email: 'owner1@unipulse.edu' } });
    const owner2 = await prisma.user.findUnique({ where: { email: 'owner2@unipulse.edu' } });
    const student = await prisma.user.findUnique({ where: { email: 'student1@unipulse.edu' } });

    if (!owner1 || !owner2 || !student) {
      throw new Error('Seed accounts missing. Please seed test database first.');
    }

    owner1Id = owner1.id;
    owner2Id = owner2.id;
    owner1Token = signToken(owner1).token;
    owner2Token = signToken(owner2).token;
    studentToken = signToken(student).token;

    // Create a draft survey with questions for owner1
    const s1 = await prisma.survey.create({
      data: {
        id: `srv_test_lifecycle_${Date.now()}`,
        ownerId: owner1Id,
        title: 'Lifecycle Test Survey With Questions',
        description: 'Test survey for publishing and closing',
        status: SurveyStatus.DRAFT,
        updatedAt: new Date(),
        Question: {
          create: [
            {
              id: `qst_test_1_${Date.now()}`,
              text: 'Rate your experience',
              type: 'RATING',
              isRequired: true,
              displayOrder: 1,
            },
          ],
        },
      },
    });
    surveyWithQuestionsId = s1.id;

    // Create a draft survey with ZERO questions for owner1
    const s2 = await prisma.survey.create({
      data: {
        id: `srv_test_empty_${Date.now()}`,
        ownerId: owner1Id,
        title: 'Empty Lifecycle Test Survey',
        description: 'Survey with no questions',
        status: SurveyStatus.DRAFT,
        updatedAt: new Date(),
      },
    });
    surveyEmptyId = s2.id;
  });

  afterAll(async () => {
    if (surveyWithQuestionsId) {
      await prisma.survey.deleteMany({ where: { id: surveyWithQuestionsId } });
    }
    if (surveyEmptyId) {
      await prisma.survey.deleteMany({ where: { id: surveyEmptyId } });
    }
    await prisma.$disconnect();
  });

  describe('POST /api/surveys/:id/publish', () => {
    it('TEST-16 (AC-13): should reject publishing a draft survey with 0 questions with 422 EMPTY_SURVEY_CANNOT_PUBLISH', async () => {
      const res = await request(app)
        .post(`/api/surveys/${surveyEmptyId}/publish`)
        .set('Authorization', `Bearer ${owner1Token}`);

      expect(res.status).toBe(422);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('EMPTY_SURVEY_CANNOT_PUBLISH');
    });

    it('TEST-29 (AC-06): should reject Owner A attempting to publish Owner B survey with 403 FORBIDDEN_OWNERSHIP', async () => {
      const res = await request(app)
        .post(`/api/surveys/${surveyWithQuestionsId}/publish`)
        .set('Authorization', `Bearer ${owner2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_OWNERSHIP');
    });

    it('AC-05: should reject Respondent attempting to publish survey with 403 FORBIDDEN_ROLE', async () => {
      const res = await request(app)
        .post(`/api/surveys/${surveyWithQuestionsId}/publish`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });

    it('should reject unauthenticated request with 401 UNAUTHORIZED', async () => {
      const res = await request(app).post(`/api/surveys/${surveyWithQuestionsId}/publish`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('TEST-15 (AC-12): should successfully publish draft survey containing questions with 200 OK', async () => {
      const res = await request(app)
        .post(`/api/surveys/${surveyWithQuestionsId}/publish`)
        .set('Authorization', `Bearer ${owner1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(surveyWithQuestionsId);
      expect(res.body.data.status).toBe('PUBLISHED');
      expect(res.body.data.publishedAt).toBeDefined();
    });

    it('should reject publishing an already PUBLISHED survey with 400 INVALID_STATE_TRANSITION', async () => {
      const res = await request(app)
        .post(`/api/surveys/${surveyWithQuestionsId}/publish`)
        .set('Authorization', `Bearer ${owner1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });
  });

  describe('POST /api/surveys/:id/close', () => {
    it('should reject closing a survey that is in DRAFT status with 400 INVALID_STATE_TRANSITION', async () => {
      const res = await request(app)
        .post(`/api/surveys/${surveyEmptyId}/close`)
        .set('Authorization', `Bearer ${owner1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('TEST-29 (AC-06): should reject Owner A attempting to close Owner B survey with 403 FORBIDDEN_OWNERSHIP', async () => {
      const res = await request(app)
        .post(`/api/surveys/${surveyWithQuestionsId}/close`)
        .set('Authorization', `Bearer ${owner2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_OWNERSHIP');
    });

    it('AC-05: should reject Respondent attempting to close survey with 403 FORBIDDEN_ROLE', async () => {
      const res = await request(app)
        .post(`/api/surveys/${surveyWithQuestionsId}/close`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });

    it('TEST-18 (AC-14): should successfully close an active published survey with 200 OK', async () => {
      const res = await request(app)
        .post(`/api/surveys/${surveyWithQuestionsId}/close`)
        .set('Authorization', `Bearer ${owner1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(surveyWithQuestionsId);
      expect(res.body.data.status).toBe('CLOSED');
      expect(res.body.data.closedAt).toBeDefined();
    });

    it('should reject closing an already CLOSED survey with 400 INVALID_STATE_TRANSITION', async () => {
      const res = await request(app)
        .post(`/api/surveys/${surveyWithQuestionsId}/close`)
        .set('Authorization', `Bearer ${owner1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });
  });
});
