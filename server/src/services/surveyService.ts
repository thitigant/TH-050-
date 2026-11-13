import crypto from 'crypto';
import { prisma } from '../db/prisma.js';
import { CreateSurveyInput } from '../validators/surveyValidator.js';
import { SurveyStatus, ResponseMode } from '@prisma/client';
import { AppError } from '../utils/errors.js';

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

  async getPublishedSurveysForRespondent(respondentId: string) {
    const surveys = await prisma.survey.findMany({
      where: {
        status: SurveyStatus.PUBLISHED,
      },
      orderBy: {
        publishedAt: 'desc',
      },
      include: {
        _count: {
          select: {
            Question: true,
            Response: true,
          },
        },
        Response: {
          where: {
            respondentId,
          },
          select: {
            id: true,
          },
        },
      },
    });

    return surveys.map((survey) => {
      const { Response, ...rest } = survey;
      return {
        ...rest,
        hasSubmitted: Response.length > 0,
      };
    });
  }

  async getSurveyById(surveyId: string, userId?: string) {
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
      throw new AppError(404, 'SURVEY_NOT_FOUND', 'Survey not found');
    }

    // Zero Draft Leakage (NFR-11): If survey is DRAFT and requesting user is not owner, block
    if (survey.status === SurveyStatus.DRAFT && (!userId || survey.ownerId !== userId)) {
      throw new AppError(404, 'SURVEY_NOT_FOUND', 'Survey not found');
    }

    let hasSubmitted = false;
    if (userId) {
      const userResponse = await prisma.response.findUnique({
        where: {
          surveyId_respondentId: {
            surveyId,
            respondentId: userId,
          },
        },
        select: {
          id: true,
        },
      });
      hasSubmitted = !!userResponse;
    }

    return {
      ...survey,
      hasSubmitted,
    };
  }

  async publishSurvey(surveyId: string, ownerId: string) {
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        _count: {
          select: { Question: true },
        },
      },
    });

    if (!survey) {
      throw new AppError(404, 'SURVEY_NOT_FOUND', 'Survey not found');
    }

    if (survey.ownerId !== ownerId) {
      throw new AppError(403, 'FORBIDDEN_OWNERSHIP', 'Access denied. You do not own this survey.');
    }

    if (survey.status !== SurveyStatus.DRAFT) {
      throw new AppError(
        400,
        'INVALID_STATE_TRANSITION',
        `Cannot publish survey with status '${survey.status}'. Must be DRAFT.`
      );
    }

    if (survey._count.Question === 0) {
      throw new AppError(
        422,
        'EMPTY_SURVEY_CANNOT_PUBLISH',
        'Cannot publish a survey with zero questions. Add at least 1 question.'
      );
    }

    const now = new Date();
    // Atomic state transition to prevent concurrent race conditions
    const updateResult = await prisma.survey.updateMany({
      where: {
        id: surveyId,
        ownerId,
        status: SurveyStatus.DRAFT,
      },
      data: {
        status: SurveyStatus.PUBLISHED,
        publishedAt: now,
        updatedAt: now,
      },
    });

    if (updateResult.count === 0) {
      const current = await prisma.survey.findUnique({ where: { id: surveyId } });
      if (!current) {
        throw new AppError(404, 'SURVEY_NOT_FOUND', 'Survey not found');
      }
      if (current.ownerId !== ownerId) {
        throw new AppError(403, 'FORBIDDEN_OWNERSHIP', 'Access denied. You do not own this survey.');
      }
      throw new AppError(
        400,
        'INVALID_STATE_TRANSITION',
        `Cannot publish survey with status '${current.status}'. Must be DRAFT.`
      );
    }

    return prisma.survey.findUnique({
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
  }

  async closeSurvey(surveyId: string, ownerId: string) {
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
    });

    if (!survey) {
      throw new AppError(404, 'SURVEY_NOT_FOUND', 'Survey not found');
    }

    if (survey.ownerId !== ownerId) {
      throw new AppError(403, 'FORBIDDEN_OWNERSHIP', 'Access denied. You do not own this survey.');
    }

    if (survey.status !== SurveyStatus.PUBLISHED) {
      throw new AppError(
        400,
        'INVALID_STATE_TRANSITION',
        `Cannot close survey with status '${survey.status}'. Only PUBLISHED surveys can be closed.`
      );
    }

    const now = new Date();
    // Atomic state transition
    const updateResult = await prisma.survey.updateMany({
      where: {
        id: surveyId,
        ownerId,
        status: SurveyStatus.PUBLISHED,
      },
      data: {
        status: SurveyStatus.CLOSED,
        closedAt: now,
        updatedAt: now,
      },
    });

    if (updateResult.count === 0) {
      const current = await prisma.survey.findUnique({ where: { id: surveyId } });
      if (!current) {
        throw new AppError(404, 'SURVEY_NOT_FOUND', 'Survey not found');
      }
      if (current.ownerId !== ownerId) {
        throw new AppError(403, 'FORBIDDEN_OWNERSHIP', 'Access denied. You do not own this survey.');
      }
      throw new AppError(
        400,
        'INVALID_STATE_TRANSITION',
        `Cannot close survey with status '${current.status}'. Only PUBLISHED surveys can be closed.`
      );
    }

    return prisma.survey.findUnique({
      where: { id: surveyId },
    });
  }
}

export const surveyService = new SurveyService();
