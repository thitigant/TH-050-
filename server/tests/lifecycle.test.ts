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

  let surveyToPublishId: string;
  let surveyToCloseId: string;
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

    // 1. Create a DRAFT survey with questions for testing publish
    const s1 = await prisma.survey.create({
      data: {
        id: `srv_test_pub_${Date.now()}`,
        ownerId: owner1Id,
        title: 'Lifecycle Publish Test Survey',
        description: 'Test survey for publishing',
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
    surveyToPublishId = s1.id;

    // 2. Create an already PUBLISHED survey for independent testing of close
    const s2 = await prisma.survey.create({
      data: {
        id: `srv_test_close_${Date.now()}`,
        ownerId: owner1Id,
        title: 'Lifecycle Close Test Survey',
        description: 'Test survey already published',
        status: SurveyStatus.PUBLISHED,
        publishedAt: new Date(),
        updatedAt: new Date(),
        Question: {
          create: [
            {
              id: `qst_test_2_${Date.now()}`,
              text: 'Feedback question',
              type: 'SHORT_TEXT',
              isRequired: true,
              displayOrder: 1,
            },
          ],
        },
      },
    });
    surveyToCloseId = s2.id;

    // 3. Create a DRAFT survey with ZERO questions for testing empty block
    const s3 = await prisma.survey.create({
      data: {
        id: `srv_test_empty_${Date.now()}`,
        ownerId: owner1Id,
        title: 'Empty Lifecycle Test Survey',
        description: 'Survey with no questions',
        status: SurveyStatus.DRAFT,
        updatedAt: new Date(),
      },
    });
    surveyEmptyId = s3.id;
  });

  afterAll(async () => {
    const idsToDelete = [surveyToPublishId, surveyToCloseId, surveyEmptyId].filter(Boolean);
    if (idsToDelete.length > 0) {
      await prisma.survey.deleteMany({ where: { id: { in: idsToDelete } } });
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

    it('TEST-29 (AC-06): should reject Owner 2 attempting to publish Owner 1 survey with 403 FORBIDDEN_OWNERSHIP', async () => {
      const res = await request(app)
        .post(`/api/surveys/${surveyToPublishId}/publish`)
        .set('Authorization', `Bearer ${owner2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_OWNERSHIP');
    });

    it('AC-05: should reject Respondent attempting to publish survey with 403 FORBIDDEN_ROLE', async () => {
      const res = await request(app)
        .post(`/api/surveys/${surveyToPublishId}/publish`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });

    it('should reject unauthenticated request with 401 UNAUTHORIZED', async () => {
      const res = await request(app).post(`/api/surveys/${surveyToPublishId}/publish`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('TEST-15 (AC-12): should successfully publish draft survey containing questions with 200 OK and valid non-null publishedAt', async () => {
      const res = await request(app)
        .post(`/api/surveys/${surveyToPublishId}/publish`)
        .set('Authorization', `Bearer ${owner1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(surveyToPublishId);
      expect(res.body.data.status).toBe('PUBLISHED');
      // Strong assertion: ensure publishedAt is not null and is a valid ISO timestamp
      expect(res.body.data.publishedAt).not.toBeNull();
      expect(typeof res.body.data.publishedAt).toBe('string');
      expect(new Date(res.body.data.publishedAt).getTime()).not.toBeNaN();
    });

    it('should reject publishing an already PUBLISHED survey with 400 INVALID_STATE_TRANSITION', async () => {
      const res = await request(app)
        .post(`/api/surveys/${surveyToCloseId}/publish`)
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

    it('TEST-29 (AC-06): should reject Owner 2 attempting to close Owner 1 survey with 403 FORBIDDEN_OWNERSHIP', async () => {
      const res = await request(app)
        .post(`/api/surveys/${surveyToCloseId}/close`)
        .set('Authorization', `Bearer ${owner2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_OWNERSHIP');
    });

    it('AC-05: should reject Respondent attempting to close survey with 403 FORBIDDEN_ROLE', async () => {
      const res = await request(app)
        .post(`/api/surveys/${surveyToCloseId}/close`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });

    it('TEST-18 (AC-14): should successfully close an active published survey with 200 OK and valid non-null closedAt', async () => {
      const res = await request(app)
        .post(`/api/surveys/${surveyToCloseId}/close`)
        .set('Authorization', `Bearer ${owner1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(surveyToCloseId);
      expect(res.body.data.status).toBe('CLOSED');
      // Strong assertion: ensure closedAt is not null and is a valid ISO timestamp
      expect(res.body.data.closedAt).not.toBeNull();
      expect(typeof res.body.data.closedAt).toBe('string');
      expect(new Date(res.body.data.closedAt).getTime()).not.toBeNaN();
    });

    it('should reject closing an already CLOSED survey with 400 INVALID_STATE_TRANSITION', async () => {
      const res = await request(app)
        .post(`/api/surveys/${surveyToCloseId}/close`)
        .set('Authorization', `Bearer ${owner1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });
  });
});
