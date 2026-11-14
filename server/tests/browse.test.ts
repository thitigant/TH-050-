import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/db/prisma.js';
import { signToken } from '../src/utils/jwt.js';
import { SurveyStatus } from '@prisma/client';

describe('F-05 / F-06 Browse and Open Published Surveys for Respondents', () => {
  let owner1Token: string;
  let owner2Token: string;
  let student1Token: string;
  let student2Token: string;

  let owner1Id: string;
  let owner2Id: string;
  let student1Id: string;
  let student2Id: string;

  let publishedSurvey1Id: string;
  let publishedSurvey2Id: string;
  let draftSurveyId: string;
  let closedSurveyId: string;
  let expiredSurveyId: string;
  let submittedResponseId: string;

  beforeAll(async () => {
    const owner1 = await prisma.user.findUnique({ where: { email: 'owner1@unipulse.edu' } });
    const owner2 = await prisma.user.findUnique({ where: { email: 'owner2@unipulse.edu' } });
    const student1 = await prisma.user.findUnique({ where: { email: 'student1@unipulse.edu' } });
    const student2 = await prisma.user.findUnique({ where: { email: 'student2@unipulse.edu' } });

    if (!owner1 || !owner2 || !student1 || !student2) {
      throw new Error('Seed accounts missing. Please seed test database first.');
    }

    owner1Id = owner1.id;
    owner2Id = owner2.id;
    student1Id = student1.id;
    student2Id = student2.id;

    owner1Token = signToken(owner1).token;
    owner2Token = signToken(owner2).token;
    student1Token = signToken(student1).token;
    student2Token = signToken(student2).token;

    const timestamp = Date.now();

    // 1. Create a PUBLISHED survey with questions
    const s1 = await prisma.survey.create({
      data: {
        id: `srv_pub1_${timestamp}`,
        ownerId: owner1Id,
        title: 'Active Published Survey 1',
        description: 'First published survey for browsing',
        status: SurveyStatus.PUBLISHED,
        publishedAt: new Date(timestamp - 10000),
        updatedAt: new Date(),
        Question: {
          create: [
            {
              id: `qst_pub1_1_${timestamp}`,
              text: 'How clear are the course objectives?',
              type: 'RATING',
              isRequired: true,
              displayOrder: 1,
            },
            {
              id: `qst_pub1_2_${timestamp}`,
              text: 'Preferred study method?',
              type: 'SINGLE_CHOICE',
              isRequired: true,
              displayOrder: 2,
              QuestionOption: {
                create: [
                  { id: `opt_pub1_1_${timestamp}`, label: 'Self-study', displayOrder: 1 },
                  { id: `opt_pub1_2_${timestamp}`, label: 'Group study', displayOrder: 2 },
                ],
              },
            },
          ],
        },
      },
    });
    publishedSurvey1Id = s1.id;

    // 2. Create another PUBLISHED survey (to test multiple items & response status)
    const s2 = await prisma.survey.create({
      data: {
        id: `srv_pub2_${timestamp}`,
        ownerId: owner1Id,
        title: 'Active Published Survey 2',
        description: 'Second published survey for browsing',
        status: SurveyStatus.PUBLISHED,
        publishedAt: new Date(timestamp - 5000),
        updatedAt: new Date(),
        Question: {
          create: [
            {
              id: `qst_pub2_1_${timestamp}`,
              text: 'General comments',
              type: 'SHORT_TEXT',
              isRequired: false,
              displayOrder: 1,
            },
          ],
        },
      },
    });
    publishedSurvey2Id = s2.id;

    // 3. Create a DRAFT survey (must NOT be visible to respondents - NFR-11 Zero Draft Leakage)
    const sDraft = await prisma.survey.create({
      data: {
        id: `srv_draft_${timestamp}`,
        ownerId: owner1Id,
        title: 'Confidential Draft Survey',
        description: 'Should never leak to respondents',
        status: SurveyStatus.DRAFT,
        updatedAt: new Date(),
        Question: {
          create: [
            {
              id: `qst_draft_1_${timestamp}`,
              text: 'Unpublished draft question',
              type: 'SHORT_TEXT',
              isRequired: true,
              displayOrder: 1,
            },
          ],
        },
      },
    });
    draftSurveyId = sDraft.id;

    // 4. Create a CLOSED survey (must NOT be listed in respondent active catalog)
    const sClosed = await prisma.survey.create({
      data: {
        id: `srv_closed_${timestamp}`,
        ownerId: owner1Id,
        title: 'Expired Closed Survey',
        description: 'Survey that has concluded',
        status: SurveyStatus.CLOSED,
        publishedAt: new Date(timestamp - 20000),
        closedAt: new Date(timestamp - 1000),
        updatedAt: new Date(),
        Question: {
          create: [
            {
              id: `qst_closed_1_${timestamp}`,
              text: 'Retrospective question from closed survey',
              type: 'SHORT_TEXT',
              isRequired: true,
              displayOrder: 1,
            },
          ],
        },
      },
    });
    closedSurveyId = sClosed.id;

    // 5. Create a PUBLISHED survey whose closesAt deadline has already expired
    const sExpired = await prisma.survey.create({
      data: {
        id: `srv_expired_${timestamp}`,
        ownerId: owner1Id,
        title: 'Expired Deadline Survey',
        description: 'Survey past its closesAt cutoff',
        status: SurveyStatus.PUBLISHED,
        publishedAt: new Date(timestamp - 25000),
        closesAt: new Date(timestamp - 1000),
        updatedAt: new Date(),
      },
    });
    expiredSurveyId = sExpired.id;

    // 6. Create a Response for student1 on publishedSurvey1Id to test hasSubmitted: true
    const resp = await prisma.response.create({
      data: {
        id: `rsp_test_${timestamp}`,
        surveyId: publishedSurvey1Id,
        respondentId: student1Id,
        submittedAt: new Date(),
      },
    });
    submittedResponseId = resp.id;
  });

  afterAll(async () => {
    if (submittedResponseId) {
      await prisma.response.deleteMany({ where: { id: submittedResponseId } });
    }
    const idsToDelete = [publishedSurvey1Id, publishedSurvey2Id, draftSurveyId, closedSurveyId, expiredSurveyId].filter(Boolean);
    if (idsToDelete.length > 0) {
      await prisma.survey.deleteMany({ where: { id: { in: idsToDelete } } });
    }
    await prisma.$disconnect();
  });

  describe('GET /api/surveys - Browse Published Surveys for Respondents', () => {
    it('TEST-10 (FR-10, AC-10): should return only PUBLISHED surveys with hasSubmitted flag for Respondent', async () => {
      const res = await request(app)
        .get('/api/surveys')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);

      const surveys = res.body.data;
      // All returned surveys must have status 'PUBLISHED'
      expect(surveys.length).toBeGreaterThanOrEqual(2);
      surveys.forEach((survey: any) => {
        expect(survey.status).toBe('PUBLISHED');
        expect(typeof survey.hasSubmitted).toBe('boolean');
      });

      // Must include publishedSurvey1 and publishedSurvey2
      const s1 = surveys.find((s: any) => s.id === publishedSurvey1Id);
      const s2 = surveys.find((s: any) => s.id === publishedSurvey2Id);
      expect(s1).toBeDefined();
      expect(s2).toBeDefined();

      // Ordering assertion: publishedAt desc (survey 2 was published after survey 1)
      const index1 = surveys.findIndex((s: any) => s.id === publishedSurvey1Id);
      const index2 = surveys.findIndex((s: any) => s.id === publishedSurvey2Id);
      expect(index2).toBeLessThan(index1);

      // Projection assertion: respondent catalog must NOT leak owner-facing metadata or response counts
      surveys.forEach((survey: any) => {
        expect(survey.ownerId).toBeUndefined();
        expect(survey.responseMode).toBeUndefined();
        if (survey._count) {
          expect(survey._count.Response).toBeUndefined();
          expect(typeof survey._count.Question).toBe('number');
        }
      });

      // student1 has submitted survey1, but NOT survey2
      expect(s1.hasSubmitted).toBe(true);
      expect(s2.hasSubmitted).toBe(false);
    });

    it('NFR-11 Zero Draft Leakage: should NEVER include DRAFT, CLOSED, or deadline-expired surveys in respondent catalog', async () => {
      const res = await request(app)
        .get('/api/surveys')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      const surveys = res.body.data;

      const foundDraft = surveys.find((s: any) => s.id === draftSurveyId);
      const foundClosed = surveys.find((s: any) => s.id === closedSurveyId);
      const foundExpired = surveys.find((s: any) => s.id === expiredSurveyId);

      expect(foundDraft).toBeUndefined();
      expect(foundClosed).toBeUndefined();
      expect(foundExpired).toBeUndefined();
    });

    it('BR-06 / FR-10: student2 should see hasSubmitted = false for publishedSurvey1 since they have not submitted', async () => {
      const res = await request(app)
        .get('/api/surveys')
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(200);
      const s1 = res.body.data.find((s: any) => s.id === publishedSurvey1Id);
      expect(s1).toBeDefined();
      expect(s1.hasSubmitted).toBe(false);
    });

    it('should allow Owner to view their own surveys (including DRAFT)', async () => {
      const res = await request(app)
        .get('/api/surveys')
        .set('Authorization', `Bearer ${owner1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      const ownerSurveys = res.body.data;
      const foundDraft = ownerSurveys.find((s: any) => s.id === draftSurveyId);
      const foundPublished = ownerSurveys.find((s: any) => s.id === publishedSurvey1Id);

      expect(foundDraft).toBeDefined();
      expect(foundPublished).toBeDefined();
    });

    it('should reject unauthenticated request with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/surveys');

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should work identically on /api/v1/surveys path', async () => {
      const res = await request(app)
        .get('/api/v1/surveys')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const s1 = res.body.data.find((s: any) => s.id === publishedSurvey1Id);
      expect(s1).toBeDefined();
      expect(s1.status).toBe('PUBLISHED');
      expect(s1.hasSubmitted).toBe(true);
    });
  });

  describe('GET /api/surveys/:id - Inspect Survey Details for Respondents', () => {
    it('TEST-11 (FR-11, AC-11): should allow Respondent to inspect details and questions of a PUBLISHED survey', async () => {
      const res = await request(app)
        .get(`/api/surveys/${publishedSurvey1Id}`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(publishedSurvey1Id);
      expect(res.body.data.status).toBe('PUBLISHED');
      expect(res.body.data.hasSubmitted).toBe(true);

      // Verify questions are loaded in order
      expect(Array.isArray(res.body.data.Question)).toBe(true);
      expect(res.body.data.Question).toHaveLength(2);

      const q1 = res.body.data.Question[0];
      expect(q1.type).toBe('RATING');
      expect(q1.displayOrder).toBe(1);

      const q2 = res.body.data.Question[1];
      expect(q2.type).toBe('SINGLE_CHOICE');
      expect(q2.displayOrder).toBe(2);
      expect(q2.QuestionOption).toHaveLength(2);
    });

    it('FR-11: should show hasSubmitted = false when Respondent opens a survey they have not submitted', async () => {
      const res = await request(app)
        .get(`/api/surveys/${publishedSurvey2Id}`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(publishedSurvey2Id);
      expect(res.body.data.hasSubmitted).toBe(false);
    });

    it('NFR-11 Zero Draft Leakage: should return 404 SURVEY_NOT_FOUND when Respondent requests DRAFT survey', async () => {
      const res = await request(app)
        .get(`/api/surveys/${draftSurveyId}`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('SURVEY_NOT_FOUND');
    });

    it('NFR-11 Zero Draft Leakage: should return 404 when non-owner Survey Owner requests another owner\'s DRAFT survey', async () => {
      const res = await request(app)
        .get(`/api/surveys/${draftSurveyId}`)
        .set('Authorization', `Bearer ${owner2Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('SURVEY_NOT_FOUND');
    });

    it('should return 404 for non-existent survey ID', async () => {
      const res = await request(app)
        .get('/api/surveys/srv_non_existent_999999')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('SURVEY_NOT_FOUND');
    });

    it('F-10 / FR-11: should allow Respondent to inspect a CLOSED survey by ID to review questions', async () => {
      const res = await request(app)
        .get(`/api/surveys/${closedSurveyId}`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(closedSurveyId);
      expect(res.body.data.status).toBe('CLOSED');
      expect(res.body.data.Question).toHaveLength(1);
      expect(res.body.data.hasSubmitted).toBe(false);
    });

    it('should allow Survey Owner to inspect another owner\'s PUBLISHED survey by ID', async () => {
      const res = await request(app)
        .get(`/api/surveys/${publishedSurvey1Id}`)
        .set('Authorization', `Bearer ${owner2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(publishedSurvey1Id);
      expect(res.body.data.status).toBe('PUBLISHED');
      expect(res.body.data.Question).toHaveLength(2);
    });

    it('should reject unauthenticated detail request with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get(`/api/surveys/${publishedSurvey1Id}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
