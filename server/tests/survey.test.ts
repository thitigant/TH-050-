import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/db/prisma.js';
import { signToken } from '../src/utils/jwt.js';

describe('F-03 Create Draft Survey with Validation Limits', () => {
  let ownerToken: string;
  let studentToken: string;
  let createdSurveyId: string;

  beforeAll(async () => {
    const owner = await prisma.user.findUnique({ where: { email: 'owner1@unipulse.edu' } });
    const student = await prisma.user.findUnique({ where: { email: 'student1@unipulse.edu' } });

    if (!owner || !student) {
      throw new Error('Seed accounts missing. Run npm run db:seed first.');
    }

    ownerToken = signToken(owner).token;
    studentToken = signToken(student).token;
  });

  afterAll(async () => {
    if (createdSurveyId) {
      await prisma.survey.deleteMany({ where: { id: createdSurveyId } });
    }
    await prisma.$disconnect();
  });

  describe('POST /api/surveys', () => {
    it('TEST-11 (AC-11): should allow Survey Owner to create draft survey with Single Choice, Rating, and Short Text questions', async () => {
      const payload = {
        title: 'Midterm Course Experience Survey',
        description: 'Feedback on lectures, labs, and assignments',
        responseMode: 'IDENTIFIED',
        questions: [
          {
            text: 'How satisfied are you with the course pace?',
            type: 'RATING',
            isRequired: true,
            displayOrder: 1,
          },
          {
            text: 'Which topic did you find most engaging?',
            type: 'SINGLE_CHOICE',
            isRequired: true,
            displayOrder: 2,
            options: ['Software Architecture', 'TDD & Testing', 'Git & CI/CD'],
          },
          {
            text: 'What suggestions do you have for the remaining labs?',
            type: 'SHORT_TEXT',
            isRequired: false,
            displayOrder: 3,
          },
        ],
      };

      const res = await request(app)
        .post('/api/surveys')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.title).toBe(payload.title);
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.Question).toHaveLength(3);

      const ratingQ = res.body.data.Question.find((q: any) => q.type === 'RATING');
      expect(ratingQ).toBeDefined();
      expect(ratingQ.text).toBe('How satisfied are you with the course pace?');

      const choiceQ = res.body.data.Question.find((q: any) => q.type === 'SINGLE_CHOICE');
      expect(choiceQ).toBeDefined();
      expect(choiceQ.QuestionOption).toHaveLength(3);
      expect(choiceQ.QuestionOption[0].label).toBe('Software Architecture');

      createdSurveyId = res.body.data.id;
    });

    it('should reject survey creation by a Respondent with 403 FORBIDDEN_ROLE', async () => {
      const res = await request(app)
        .post('/api/surveys')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Unauthorized Survey',
          questions: [],
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
    });

    it('TEST-12 (AC-12): should reject survey when title is empty or exceeds 150 characters', async () => {
      // Empty title
      const resEmpty = await request(app)
        .post('/api/surveys')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: '   ',
          questions: [],
        });

      expect(resEmpty.status).toBe(400);
      expect(resEmpty.body.error.code).toBe('INVALID_PAYLOAD');

      // Title > 150 chars
      const resTooLong = await request(app)
        .post('/api/surveys')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'A'.repeat(151),
          questions: [],
        });

      expect(resTooLong.status).toBe(400);
      expect(resTooLong.body.error.code).toBe('INVALID_PAYLOAD');
    });

    it('TEST-12 (AC-12): should reject Single Choice question with less than 2 options', async () => {
      const res = await request(app)
        .post('/api/surveys')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Invalid Single Choice Survey',
          questions: [
            {
              text: 'Pick one',
              type: 'SINGLE_CHOICE',
              options: ['Only One Option'],
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PAYLOAD');
    });

    it('TEST-12 (AC-12): should reject Single Choice question with duplicate options', async () => {
      const res = await request(app)
        .post('/api/surveys')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Duplicate Option Survey',
          questions: [
            {
              text: 'Pick one',
              type: 'SINGLE_CHOICE',
              options: ['Option A', 'option a'],
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PAYLOAD');
    });

    it('TEST-12 (AC-12): should reject survey with more than 30 questions', async () => {
      const questions = Array.from({ length: 31 }, (_, i) => ({
        text: `Question ${i + 1}`,
        type: 'SHORT_TEXT',
      }));

      const res = await request(app)
        .post('/api/surveys')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Overloaded Survey',
          questions,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PAYLOAD');
    });
  });

  describe('GET /api/surveys', () => {
    it('should list all surveys created by the owner', async () => {
      const res = await request(app)
        .get('/api/surveys')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((s: any) => s.id === createdSurveyId)).toBe(true);
    });
  });

  describe('GET /api/surveys/:id', () => {
    it('should fetch survey details with questions and options', async () => {
      const res = await request(app)
        .get(`/api/surveys/${createdSurveyId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdSurveyId);
      expect(res.body.data.Question).toHaveLength(3);
    });
  });
});
