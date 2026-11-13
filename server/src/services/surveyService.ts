import crypto from 'crypto';
import { prisma } from '../db/prisma.js';
import { CreateSurveyInput } from '../validators/surveyValidator.js';
import { SurveyStatus, ResponseMode } from '@prisma/client';

export class SurveyService {
  async createDraftSurvey(ownerId: string, input: CreateSurveyInput) {
    const surveyId = `srv_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

    // Build nested questions data
    const questionsData = (input.questions || []).map((q, qIndex) => {
      const questionId = `qst_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
      const optionsData = (q.options || []).map((optLabel, optIndex) => ({
        id: `opt_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
        label: optLabel,
        displayOrder: optIndex + 1,
      }));

      return {
        id: questionId,
        text: q.text,
        type: q.type,
        isRequired: q.isRequired ?? true,
        displayOrder: q.displayOrder ?? qIndex + 1,
        QuestionOption: {
          create: optionsData,
        },
      };
    });

    const survey = await prisma.survey.create({
      data: {
        id: surveyId,
        ownerId,
        title: input.title,
        description: input.description,
        status: SurveyStatus.DRAFT,
        responseMode: (input.responseMode as ResponseMode) || ResponseMode.IDENTIFIED,
        updatedAt: new Date(),
        Question: {
          create: questionsData,
        },
      },
      include: {
        Question: {
          orderBy: { displayOrder: 'asc' },
          include: {
            QuestionOption: {
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
    });

    return survey;
  }

  async getOwnerSurveys(ownerId: string) {
    return prisma.survey.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            Question: true,
            Response: true,
          },
        },
      },
    });
  }

  async getSurveyById(surveyId: string, ownerId?: string) {
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        Question: {
          orderBy: { displayOrder: 'asc' },
          include: {
            QuestionOption: {
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!survey) {
      const error: any = new Error('Survey not found');
      error.statusCode = 404;
      error.code = 'SURVEY_NOT_FOUND';
      throw error;
    }

    // If survey is DRAFT and requesting user is not owner, block
    if (survey.status === SurveyStatus.DRAFT && ownerId && survey.ownerId !== ownerId) {
      const error: any = new Error('Survey not found or access denied');
      error.statusCode = 404;
      error.code = 'SURVEY_NOT_FOUND';
      throw error;
    }

    return survey;
  }

  async publishSurvey(surveyId: string, ownerId: string) {
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        Question: true,
      },
    });

    if (!survey) {
      const error: any = new Error('Survey not found');
      error.statusCode = 404;
      error.code = 'SURVEY_NOT_FOUND';
      throw error;
    }

    if (survey.ownerId !== ownerId) {
      const error: any = new Error('Access denied. You do not own this survey.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN_OWNERSHIP';
      throw error;
    }

    if (survey.status !== SurveyStatus.DRAFT) {
      const error: any = new Error(`Cannot publish survey with status '${survey.status}'. Must be DRAFT.`);
      error.statusCode = 400;
      error.code = 'INVALID_STATE_TRANSITION';
      throw error;
    }

    if (!survey.Question || survey.Question.length === 0) {
      const error: any = new Error('Cannot publish a survey with zero questions. Add at least 1 question.');
      error.statusCode = 422;
      error.code = 'EMPTY_SURVEY_CANNOT_PUBLISH';
      throw error;
    }

    return prisma.survey.update({
      where: { id: surveyId },
      data: {
        status: SurveyStatus.PUBLISHED,
        publishedAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        Question: {
          orderBy: { displayOrder: 'asc' },
          include: {
            QuestionOption: {
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
    });
  }

  async closeSurvey(surveyId: string, ownerId: string) {
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
    });

    if (!survey) {
      const error: any = new Error('Survey not found');
      error.statusCode = 404;
      error.code = 'SURVEY_NOT_FOUND';
      throw error;
    }

    if (survey.ownerId !== ownerId) {
      const error: any = new Error('Access denied. You do not own this survey.');
      error.statusCode = 403;
      error.code = 'FORBIDDEN_OWNERSHIP';
      throw error;
    }

    if (survey.status !== SurveyStatus.PUBLISHED) {
      const error: any = new Error(
        `Cannot close survey with status '${survey.status}'. Only PUBLISHED surveys can be closed.`
      );
      error.statusCode = 400;
      error.code = 'INVALID_STATE_TRANSITION';
      throw error;
    }

    return prisma.survey.update({
      where: { id: surveyId },
      data: {
        status: SurveyStatus.CLOSED,
        closedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}

export const surveyService = new SurveyService();
