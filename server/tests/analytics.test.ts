import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/db/prisma.js';
import { signToken } from '../src/utils/jwt.js';
import { SurveyStatus } from '@prisma/client';
import { computeRatingSummary } from '../src/services/analyticsService.js';

describe('F-08 / F-12 Aggregate Survey Results Summary', () => {
  let owner1Token: string;
  let owner2Token: string;
  let student1Token: string;

  let owner1Id: string;
  let owner2Id: string;
  let student1Id: string;
  let student2Id: string;

  let activeSurveyId: string;
  let emptySurveyId: string;

  let ratingQId: string;
  let choiceQId: string;
  let choiceOpt1Id: string;
  let choiceOpt2Id: string;
  let textQId: string;

  let createdResponse1Id: string;
  let createdResponse2Id: string;

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

    const timestamp = Date.now();

    // 1. Create a survey with responses for aggregate metrics
    choiceOpt1Id = `opt_anly_1_${timestamp}`;
    choiceOpt2Id = `opt_anly_2_${timestamp}`;
    ratingQId = `qst_anly_rate_${timestamp}`;
    choiceQId = `qst_anly_choice_${timestamp}`;
    textQId = `qst_anly_text_${timestamp}`;

    const s1 = await prisma.survey.create({
      data: {
        id: `srv_anly_${timestamp}`,
        ownerId: owner1Id,
        title: 'CPE 334 Lab 4 Course Feedback',
        description: 'Aggregate testing survey',
        status: SurveyStatus.PUBLISHED,
        publishedAt: new Date(timestamp - 10000),
        updatedAt: new Date(),
        Question: {
          create: [
            {
              id: ratingQId,
              text: 'How effective was the automated testing workshop?',
              type: 'RATING',
              isRequired: true,
              displayOrder: 1,
            },
            {
              id: choiceQId,
              text: 'Preferred development workflow?',
              type: 'SINGLE_CHOICE',
              isRequired: true,
              displayOrder: 2,
              QuestionOption: {
                create: [
                  { id: choiceOpt1Id, label: 'TDD', displayOrder: 1 },
                  { id: choiceOpt2Id, label: 'Code-first', displayOrder: 2 },
                ],
              },
            },
            {
              id: textQId,
              text: 'Additional feedback',
              type: 'SHORT_TEXT',
              isRequired: false,
              displayOrder: 3,
            },
          ],
        },
      },
    });
    activeSurveyId = s1.id;

    // 2. Insert two responses with answers
    createdResponse1Id = `rsp_anly_1_${timestamp}`;
    createdResponse2Id = `rsp_anly_2_${timestamp}`;

    await prisma.response.create({
      data: {
        id: createdResponse1Id,
        surveyId: activeSurveyId,
        respondentId: student1Id,
        submittedAt: new Date(timestamp - 5000),
        Answer: {
          create: [
            {
              id: `ans_anly_1_${timestamp}`,
              questionId: ratingQId,
              ratingValue: 5,
            },
            {
              id: `ans_anly_2_${timestamp}`,
              questionId: choiceQId,
              selectedOptionId: choiceOpt1Id,
            },
            {
              id: `ans_anly_3_${timestamp}`,
              questionId: textQId,
              textValue: 'Great workshop on integration testing.',
            },
          ],
        },
      },
    });

    await prisma.response.create({
      data: {
        id: createdResponse2Id,
        surveyId: activeSurveyId,
        respondentId: student2Id,
        submittedAt: new Date(timestamp - 2000),
        Answer: {
          create: [
            {
              id: `ans_anly_4_${timestamp}`,
              questionId: ratingQId,
              ratingValue: 3,
            },
            {
              id: `ans_anly_5_${timestamp}`,
              questionId: choiceQId,
              selectedOptionId: choiceOpt1Id,
            },
            {
              id: `ans_anly_6_${timestamp}`,
              questionId: textQId,
              textValue: 'Clear instructions.',
            },
          ],
        },
      },
    });

    // 3. Create a survey with ZERO responses (to verify graceful handling)
    const sEmpty = await prisma.survey.create({
      data: {
        id: `srv_anly_empty_${timestamp}`,
        ownerId: owner1Id,
        title: 'Survey With No Responses Yet',
        description: 'Zero response edge case',
        status: SurveyStatus.PUBLISHED,
        publishedAt: new Date(timestamp - 1000),
        updatedAt: new Date(),
        Question: {
          create: [
            {
              id: `qst_anly_empty_rate_${timestamp}`,
              text: 'Rating Question',
              type: 'RATING',
              isRequired: true,
              displayOrder: 1,
            },
            {
              id: `qst_anly_empty_choice_${timestamp}`,
              text: 'Choice Question',
              type: 'SINGLE_CHOICE',
              isRequired: true,
              displayOrder: 2,
              QuestionOption: {
                create: [
                  { id: `opt_empty_1_${timestamp}`, label: 'Option A', displayOrder: 1 },
                  { id: `opt_empty_2_${timestamp}`, label: 'Option B', displayOrder: 2 },
                ],
              },
            },
          ],
        },
      },
    });
    emptySurveyId = sEmpty.id;
  });

  afterAll(async () => {
    const surveyIds = [activeSurveyId, emptySurveyId].filter(Boolean);
    if (surveyIds.length > 0) {
      await prisma.answer.deleteMany({ where: { Question: { surveyId: { in: surveyIds } } } });
      await prisma.response.deleteMany({ where: { surveyId: { in: surveyIds } } });
      await prisma.survey.deleteMany({ where: { id: { in: surveyIds } } });
    }
    await prisma.$disconnect();
  });

  describe('TEST-34 (AC-20): Pure calculation function computeRatingSummary', () => {
    it('should compute exact averageScore and distribution for rating scores [5, 4, 5, 2]', () => {
      const summary = computeRatingSummary([5, 4, 5, 2]);

      expect(summary.totalRatings).toBe(4);
      expect(summary.averageScore).toBe(4.0);
      expect(summary.distribution).toEqual({
        '1': 0,
        '2': 1,
        '3': 0,
        '4': 1,
        '5': 2,
      });
    });

    it('should return averageScore = 0 and zero counts when ratings array is empty', () => {
      const summary = computeRatingSummary([]);

      expect(summary.totalRatings).toBe(0);
      expect(summary.averageScore).toBe(0);
      expect(summary.distribution).toEqual({
        '1': 0,
        '2': 0,
        '3': 0,
        '4': 0,
        '5': 0,
      });
    });
  });

  describe('GET /api/surveys/:id/summary & GET /api/surveys/:id/analytics', () => {
    it('AC-20: should return aggregate metrics (total responses, average score, distribution, percentages)', async () => {
      const res = await request(app)
        .get(`/api/surveys/${activeSurveyId}/summary`)
        .set('Authorization', `Bearer ${owner1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();

      const data = res.body.data;
      expect(data.surveyId).toBe(activeSurveyId);
      expect(data.title).toBe('CPE 334 Lab 4 Course Feedback');
      expect(data.status).toBe('PUBLISHED');
      expect(data.totalResponses).toBe(2);

      // Verify Questions aggregate
      expect(Array.isArray(data.questions)).toBe(true);
      expect(data.questions).toHaveLength(3);

      // 1. Rating question
      const ratingQ = data.questions.find((q: any) => q.questionId === ratingQId);
      expect(ratingQ).toBeDefined();
      expect(ratingQ.questionType).toBe('RATING');
      expect(ratingQ.summary.totalRatings).toBe(2);
      expect(ratingQ.summary.averageScore).toBe(4.0); // (5 + 3) / 2 = 4.0
      expect(ratingQ.summary.distribution).toEqual({
        '1': 0,
        '2': 0,
        '3': 1,
        '4': 0,
        '5': 1,
      });

      // 2. Choice question
      const choiceQ = data.questions.find((q: any) => q.questionId === choiceQId);
      expect(choiceQ).toBeDefined();
      expect(choiceQ.questionType).toBe('SINGLE_CHOICE');
      expect(choiceQ.summary.totalSelections).toBe(2);
      expect(choiceQ.summary.options).toHaveLength(2);

      const opt1 = choiceQ.summary.options.find((o: any) => o.optionId === choiceOpt1Id);
      const opt2 = choiceQ.summary.options.find((o: any) => o.optionId === choiceOpt2Id);
      expect(opt1.count).toBe(2);
      expect(opt1.percentage).toBe(100.0);
      expect(opt2.count).toBe(0);
      expect(opt2.percentage).toBe(0.0);

      // 3. Text question
      const textQ = data.questions.find((q: any) => q.questionId === textQId);
      expect(textQ).toBeDefined();
      expect(textQ.questionType).toBe('SHORT_TEXT');
      expect(textQ.summary.totalAnswers).toBe(2);
      expect(textQ.summary.answers).toContain('Great workshop on integration testing.');
      expect(textQ.summary.answers).toContain('Clear instructions.');
    });

    it('AC-21 & NFR-12: should contain zero respondent-identifying information in response payload', async () => {
      const res = await request(app)
        .get(`/api/surveys/${activeSurveyId}/summary`)
        .set('Authorization', `Bearer ${owner1Token}`);

      const stringified = JSON.stringify(res.body);
      expect(stringified).not.toContain(student1Id);
      expect(stringified).not.toContain(student2Id);
      expect(stringified).not.toContain('student1@unipulse.edu');
      expect(stringified).not.toContain('student2@unipulse.edu');
      expect(stringified).not.toContain('respondentId');
    });

    it('should gracefully handle survey with zero responses (show zeros without error)', async () => {
      const res = await request(app)
        .get(`/api/surveys/${emptySurveyId}/summary`)
        .set('Authorization', `Bearer ${owner1Token}`);

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.totalResponses).toBe(0);

      const ratingQ = data.questions.find((q: any) => q.questionType === 'RATING');
      expect(ratingQ.summary.averageScore).toBe(0);
      expect(ratingQ.summary.totalRatings).toBe(0);

      const choiceQ = data.questions.find((q: any) => q.questionType === 'SINGLE_CHOICE');
      expect(choiceQ.summary.totalSelections).toBe(0);
      choiceQ.summary.options.forEach((opt: any) => {
        expect(opt.count).toBe(0);
        expect(opt.percentage).toBe(0);
      });
    });

    it('TEST-29 (AC-22, AC-06): should reject non-owner Survey Owner with 403 FORBIDDEN_OWNERSHIP', async () => {
      const res = await request(app)
        .get(`/api/surveys/${activeSurveyId}/summary`)
        .set('Authorization', `Bearer ${owner2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('FORBIDDEN_OWNERSHIP');
    });

    it('should reject Respondent attempting to access analytics with 403 FORBIDDEN_ROLE', async () => {
      const res = await request(app)
        .get(`/api/surveys/${activeSurveyId}/summary`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });

    it('should return 404 SURVEY_NOT_FOUND for non-existent survey ID', async () => {
      const res = await request(app)
        .get('/api/surveys/srv_not_exist_99999/summary')
        .set('Authorization', `Bearer ${owner1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('SURVEY_NOT_FOUND');
    });

    it('should reject unauthenticated request with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get(`/api/surveys/${activeSurveyId}/summary`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should work identically on /api/v1/surveys/:id/analytics path', async () => {
      const res = await request(app)
        .get(`/api/v1/surveys/${activeSurveyId}/analytics`)
        .set('Authorization', `Bearer ${owner1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.surveyId).toBe(activeSurveyId);
      expect(res.body.data.totalResponses).toBe(2);
    });
  });
});
