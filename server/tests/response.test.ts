import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/db/prisma.js';
import { signToken } from '../src/utils/jwt.js';
import { SurveyStatus } from '@prisma/client';

describe('F-06 & F-07 Response Submission and Duplicate Prevention', () => {
  let owner1Token: string;
  let owner2Token: string;
  let student1Token: string;
  let student2Token: string;

  let owner1Id: string;
  let owner2Id: string;
  let student1Id: string;
  let student2Id: string;

  let publishedSurveyId: string;
  let draftSurveyId: string;
  let closedSurveyId: string;
  let expiredSurveyId: string;
  let concurrencySurveyId: string;

  let ratingQuestionId: string;
  let choiceQuestionId: string;
  let choiceOption1Id: string;
  let choiceOption2Id: string;
  let textQuestionId: string;
  let optionalTextQuestionId: string;

  let createdResponseId: string;

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

    // 1. Create a PUBLISHED survey with Rating, Choice, and Text questions
    choiceOption1Id = `opt_resp_1_${timestamp}`;
    choiceOption2Id = `opt_resp_2_${timestamp}`;
    ratingQuestionId = `qst_rate_${timestamp}`;
    choiceQuestionId = `qst_choice_${timestamp}`;
    textQuestionId = `qst_text_${timestamp}`;
    optionalTextQuestionId = `qst_opt_text_${timestamp}`;

    const sPub = await prisma.survey.create({
      data: {
        id: `srv_resp_pub_${timestamp}`,
        ownerId: owner1Id,
        title: 'Course Evaluation Survey',
        description: 'Semester feedback survey',
        status: SurveyStatus.PUBLISHED,
        publishedAt: new Date(timestamp - 10000),
        updatedAt: new Date(),
        Question: {
          create: [
            {
              id: ratingQuestionId,
              text: 'Rate course satisfaction from 1 to 5',
              type: 'RATING',
              isRequired: true,
              displayOrder: 1,
            },
            {
              id: choiceQuestionId,
              text: 'Preferred lecture format',
              type: 'SINGLE_CHOICE',
              isRequired: true,
              displayOrder: 2,
              QuestionOption: {
                create: [
                  { id: choiceOption1Id, label: 'In-person lecture', displayOrder: 1 },
                  { id: choiceOption2Id, label: 'Flipped classroom', displayOrder: 2 },
                ],
              },
            },
            {
              id: textQuestionId,
              text: 'What did you like most about this course?',
              type: 'SHORT_TEXT',
              isRequired: true,
              displayOrder: 3,
            },
            {
              id: optionalTextQuestionId,
              text: 'Any additional suggestions? (Optional)',
              type: 'SHORT_TEXT',
              isRequired: false,
              displayOrder: 4,
            },
          ],
        },
      },
    });
    publishedSurveyId = sPub.id;

    // 2. Create a DRAFT survey
    const sDraft = await prisma.survey.create({
      data: {
        id: `srv_resp_draft_${timestamp}`,
        ownerId: owner1Id,
        title: 'Unpublished Draft Survey',
        description: 'Should reject submissions',
        status: SurveyStatus.DRAFT,
        updatedAt: new Date(),
        Question: {
          create: [
            {
              id: `qst_draft_${timestamp}`,
              text: 'Draft question',
              type: 'SHORT_TEXT',
              isRequired: true,
              displayOrder: 1,
            },
          ],
        },
      },
    });
    draftSurveyId = sDraft.id;

    // 3. Create a CLOSED survey
    const sClosed = await prisma.survey.create({
      data: {
        id: `srv_resp_closed_${timestamp}`,
        ownerId: owner1Id,
        title: 'Closed Survey',
        description: 'Should reject submissions',
        status: SurveyStatus.CLOSED,
        publishedAt: new Date(timestamp - 20000),
        closedAt: new Date(timestamp - 1000),
        updatedAt: new Date(),
        Question: {
          create: [
            {
              id: `qst_closed_${timestamp}`,
              text: 'Closed question',
              type: 'SHORT_TEXT',
              isRequired: true,
              displayOrder: 1,
            },
          ],
        },
      },
    });
    closedSurveyId = sClosed.id;

    // 4. Create an expired PUBLISHED survey (closesAt in the past)
    const sExpired = await prisma.survey.create({
      data: {
        id: `srv_resp_exp_${timestamp}`,
        ownerId: owner1Id,
        title: 'Expired Deadline Survey',
        description: 'Should reject submissions after closesAt',
        status: SurveyStatus.PUBLISHED,
        publishedAt: new Date(timestamp - 30000),
        closesAt: new Date(timestamp - 1000),
        updatedAt: new Date(),
        Question: {
          create: [
            {
              id: `qst_exp_${timestamp}`,
              text: 'Expired question',
              type: 'SHORT_TEXT',
              isRequired: true,
              displayOrder: 1,
            },
          ],
        },
      },
    });
    expiredSurveyId = sExpired.id;

    // 5. Create a survey for concurrency test
    const sConcurrency = await prisma.survey.create({
      data: {
        id: `srv_resp_concur_${timestamp}`,
        ownerId: owner1Id,
        title: 'Concurrency Test Survey',
        description: 'Test parallel submission uniqueness',
        status: SurveyStatus.PUBLISHED,
        publishedAt: new Date(timestamp - 5000),
        updatedAt: new Date(),
        Question: {
          create: [
            {
              id: `qst_concur_${timestamp}`,
              text: 'Feedback',
              type: 'SHORT_TEXT',
              isRequired: true,
              displayOrder: 1,
            },
          ],
        },
      },
    });
    concurrencySurveyId = sConcurrency.id;
  });

  afterAll(async () => {
    const surveyIds = [publishedSurveyId, draftSurveyId, closedSurveyId, expiredSurveyId, concurrencySurveyId].filter(Boolean);
    if (surveyIds.length > 0) {
      await prisma.answer.deleteMany({ where: { Question: { surveyId: { in: surveyIds } } } });
      await prisma.response.deleteMany({ where: { surveyId: { in: surveyIds } } });
      await prisma.survey.deleteMany({ where: { id: { in: surveyIds } } });
    }
    await prisma.$disconnect();
  });

  describe('POST /api/surveys/:id/responses - Submit Survey Response', () => {
    it('TEST-26 (AC-15): should successfully submit response with answers to published survey (201 Created)', async () => {
      const payload = {
        answers: [
          {
            questionId: ratingQuestionId,
            numericValue: 5,
          },
          {
            questionId: choiceQuestionId,
            selectedOptionId: choiceOption1Id,
          },
          {
            questionId: textQuestionId,
            textValue: 'The practical hands-on labs were very engaging and clear.',
          },
          {
            questionId: optionalTextQuestionId,
            textValue: 'More examples in lectures.',
          },
        ],
      };

      const res = await request(app)
        .post(`/api/surveys/${publishedSurveyId}/responses`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.surveyId).toBe(publishedSurveyId);
      expect(res.body.data.answersRecorded).toBe(4);
      expect(res.body.data.responseId).toBeDefined();
      expect(typeof res.body.data.responseId).toBe('string');
      expect(res.body.data.submittedAt).toBeDefined();

      createdResponseId = res.body.data.responseId;
    });

    it('TEST-14 (AC-17, BR-06): should reject second submission attempt by same respondent with 409 DUPLICATE_SUBMISSION', async () => {
      const payload = {
        answers: [
          { questionId: ratingQuestionId, numericValue: 4 },
          { questionId: choiceQuestionId, selectedOptionId: choiceOption2Id },
          { questionId: textQuestionId, textValue: 'Second attempt should fail' },
        ],
      };

      const res = await request(app)
        .post(`/api/surveys/${publishedSurveyId}/responses`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send(payload);

      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('DUPLICATE_SUBMISSION');
    });

    it('TEST-19 (AC-16, BR-05): should reject submission to CLOSED survey with 400 SURVEY_NOT_ACCEPTING_RESPONSES', async () => {
      const payload = {
        answers: [
          { questionId: `qst_closed_${Date.now()}`, textValue: 'Test answer' },
        ],
      };

      const res = await request(app)
        .post(`/api/surveys/${closedSurveyId}/responses`)
        .set('Authorization', `Bearer ${student2Token}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('SURVEY_NOT_ACCEPTING_RESPONSES');
    });

    it('TEST-20 (AC-16, BR-05): should reject submission to DRAFT survey with 400 SURVEY_NOT_ACCEPTING_RESPONSES', async () => {
      const payload = {
        answers: [
          { questionId: `qst_draft_${Date.now()}`, textValue: 'Draft answer' },
        ],
      };

      const res = await request(app)
        .post(`/api/surveys/${draftSurveyId}/responses`)
        .set('Authorization', `Bearer ${student2Token}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('SURVEY_NOT_ACCEPTING_RESPONSES');
    });

    it('BR-05: should reject submission to PUBLISHED survey whose closesAt deadline has passed with 400', async () => {
      const res = await request(app)
        .post(`/api/surveys/${expiredSurveyId}/responses`)
        .set('Authorization', `Bearer ${student2Token}`)
        .send({
          answers: [
            { questionId: `qst_exp_${Date.now()}`, textValue: 'Late answer' },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('SURVEY_NOT_ACCEPTING_RESPONSES');
    });

    it('TEST-21 & TEST-27 (AC-18, BR-07): should reject Survey Owner responding to their own survey with 403 OWNER_CANNOT_RESPOND', async () => {
      const payload = {
        answers: [
          { questionId: ratingQuestionId, numericValue: 5 },
          { questionId: choiceQuestionId, selectedOptionId: choiceOption1Id },
          { questionId: textQuestionId, textValue: 'Owner answering own survey' },
        ],
      };

      const res = await request(app)
        .post(`/api/surveys/${publishedSurveyId}/responses`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .send(payload);

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('OWNER_CANNOT_RESPOND');
    });

    it('BR-07: should allow another Survey Owner to submit response to a survey they do not own', async () => {
      const payload = {
        answers: [
          { questionId: ratingQuestionId, ratingValue: 4 },
          { questionId: choiceQuestionId, selectedOptionId: choiceOption2Id },
          { questionId: textQuestionId, textValue: 'Owner 2 submitting feedback to Owner 1 survey' },
        ],
      };

      const res = await request(app)
        .post(`/api/surveys/${publishedSurveyId}/responses`)
        .set('Authorization', `Bearer ${owner2Token}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.answersRecorded).toBe(3);
    });

    it('TEST-31 (AC-19): should reject rating answer with value 0 or 6 with 422 RATING_OUT_OF_RANGE', async () => {
      // Underflow: 0
      const res0 = await request(app)
        .post(`/api/surveys/${publishedSurveyId}/responses`)
        .set('Authorization', `Bearer ${student2Token}`)
        .send({
          answers: [
            { questionId: ratingQuestionId, ratingValue: 0 },
            { questionId: choiceQuestionId, selectedOptionId: choiceOption1Id },
            { questionId: textQuestionId, textValue: 'Valid text' },
          ],
        });

      expect(res0.status).toBe(422);
      expect(res0.body.error.code).toBe('RATING_OUT_OF_RANGE');

      // Overflow: 6
      const res6 = await request(app)
        .post(`/api/surveys/${publishedSurveyId}/responses`)
        .set('Authorization', `Bearer ${student2Token}`)
        .send({
          answers: [
            { questionId: ratingQuestionId, numericValue: 6 },
            { questionId: choiceQuestionId, selectedOptionId: choiceOption1Id },
            { questionId: textQuestionId, textValue: 'Valid text' },
          ],
        });

      expect(res6.status).toBe(422);
      expect(res6.body.error.code).toBe('RATING_OUT_OF_RANGE');
    });

    it('TEST-32: should reject required text question submitted with whitespace-only with 422 EMPTY_REQUIRED_ANSWER', async () => {
      const res = await request(app)
        .post(`/api/surveys/${publishedSurveyId}/responses`)
        .set('Authorization', `Bearer ${student2Token}`)
        .send({
          answers: [
            { questionId: ratingQuestionId, numericValue: 4 },
            { questionId: choiceQuestionId, selectedOptionId: choiceOption1Id },
            { questionId: textQuestionId, textValue: '     ' },
          ],
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('EMPTY_REQUIRED_ANSWER');
    });

    it('should reject text answer exceeding 2000 characters with 400 INVALID_PAYLOAD', async () => {
      const res = await request(app)
        .post(`/api/surveys/${publishedSurveyId}/responses`)
        .set('Authorization', `Bearer ${student2Token}`)
        .send({
          answers: [
            { questionId: ratingQuestionId, numericValue: 4 },
            { questionId: choiceQuestionId, selectedOptionId: choiceOption1Id },
            { questionId: textQuestionId, textValue: 'A'.repeat(2001) },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PAYLOAD');
    });

    it('should skip storing empty answer rows for optional questions', async () => {
      // student2 submits without filling optional question
      const res = await request(app)
        .post(`/api/surveys/${publishedSurveyId}/responses`)
        .set('Authorization', `Bearer ${student2Token}`)
        .send({
          answers: [
            { questionId: ratingQuestionId, numericValue: 4 },
            { questionId: choiceQuestionId, selectedOptionId: choiceOption2Id },
            { questionId: textQuestionId, textValue: 'Valid response without optional answer' },
            { questionId: optionalTextQuestionId, textValue: null }, // empty optional answer
          ],
        });

      expect(res.status).toBe(201);
      // Only 3 answers recorded (empty optional row was skipped)
      expect(res.body.data.answersRecorded).toBe(3);
    });

    it('BR-06 concurrency: should gracefully handle parallel submissions where only one succeeds (409 for second)', async () => {
      // Create a fresh student token for parallel submission on concurrency survey
      const [res1, res2] = await Promise.all([
        request(app)
          .post(`/api/surveys/${concurrencySurveyId}/responses`)
          .set('Authorization', `Bearer ${student1Token}`)
          .send({
            answers: [
              { questionId: `qst_concur_${Date.now()}`, textValue: 'Concurrent attempt 1' },
            ],
          }),
        request(app)
          .post(`/api/surveys/${concurrencySurveyId}/responses`)
          .set('Authorization', `Bearer ${student1Token}`)
          .send({
            answers: [
              { questionId: `qst_concur_${Date.now()}`, textValue: 'Concurrent attempt 2' },
            ],
          }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      // One request should succeed (201) and one should be rejected as duplicate (409)
      expect(statuses).toEqual([201, 409]);
    });

    it('should reject missing required question with 422 EMPTY_REQUIRED_ANSWER', async () => {
      const res = await request(app)
        .post(`/api/surveys/${concurrencySurveyId}/responses`)
        .set('Authorization', `Bearer ${student2Token}`)
        .send({
          answers: [],
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('EMPTY_REQUIRED_ANSWER');
    });

    it('should reject invalid option ID for single choice question with 422 INVALID_OPTION_SELECTED', async () => {
      const res = await request(app)
        .post(`/api/surveys/${publishedSurveyId}/responses`)
        .set('Authorization', `Bearer ${student2Token}`)
        .send({
          answers: [
            { questionId: ratingQuestionId, numericValue: 4 },
            { questionId: choiceQuestionId, selectedOptionId: 'opt_non_existent_123' },
            { questionId: textQuestionId, textValue: 'Valid text' },
          ],
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INVALID_OPTION_SELECTED');
    });

    it('should reject answer for question not belonging to survey with 422 INVALID_QUESTION', async () => {
      const res = await request(app)
        .post(`/api/surveys/${publishedSurveyId}/responses`)
        .set('Authorization', `Bearer ${student2Token}`)
        .send({
          answers: [
            { questionId: 'qst_foreign_99999', numericValue: 4 },
          ],
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INVALID_QUESTION');
    });

    it('should return 404 for non-existent survey', async () => {
      const res = await request(app)
        .post('/api/surveys/srv_not_exist_999999/responses')
        .set('Authorization', `Bearer ${student2Token}`)
        .send({ answers: [] });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('SURVEY_NOT_FOUND');
    });

    it('should reject unauthenticated request with 401 UNAUTHORIZED', async () => {
      const res = await request(app)
        .post(`/api/surveys/${publishedSurveyId}/responses`)
        .send({ answers: [] });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/surveys/:id/responses/me - Personal Confirmation Receipt', () => {
    it('should allow respondent to fetch their submitted receipt with answers and questions', async () => {
      const res = await request(app)
        .get(`/api/surveys/${publishedSurveyId}/responses/me`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(createdResponseId);
      expect(res.body.data.surveyId).toBe(publishedSurveyId);
      expect(res.body.data.respondentId).toBe(student1Id);
      expect(Array.isArray(res.body.data.Answer)).toBe(true);
      expect(res.body.data.Answer).toHaveLength(4);
    });

    it('should return 404 RESPONSE_NOT_FOUND if respondent has not submitted to this survey', async () => {
      const res = await request(app)
        .get(`/api/surveys/${expiredSurveyId}/responses/me`)
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('RESPONSE_NOT_FOUND');
    });
  });

  describe('GET /api/responses/:id - Receipt by ID and Privacy Guard (BR-08, TEST-28)', () => {
    it('TEST-28: should allow Respondent A to view their own submission receipt by ID', async () => {
      const res = await request(app)
        .get(`/api/responses/${createdResponseId}`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdResponseId);
      expect(res.body.data.respondentId).toBe(student1Id);
    });

    it('TEST-28 (BR-08 Privacy Guarantee): Respondent B requesting Respondent A receipt is rejected with 403', async () => {
      const res = await request(app)
        .get(`/api/responses/${createdResponseId}`)
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_OWNERSHIP');
    });

    it('should work identically on /api/v1/responses/:id path', async () => {
      const res = await request(app)
        .get(`/api/v1/responses/${createdResponseId}`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdResponseId);
    });
  });
});
