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
}

export const surveyService = new SurveyService();
