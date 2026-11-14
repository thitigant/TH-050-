import { prisma } from '../db/prisma.js';
import { SurveyStatus, QuestionType } from '@prisma/client';
import { AppError } from '../utils/errors.js';

export interface RatingSummary {
  averageScore: number;
  totalRatings: number;
  distribution: Record<string, number>;
}

/**
 * Pure calculation function for rating aggregates (TEST-34 / AC-20)
 */
export function computeRatingSummary(scores: number[]): RatingSummary {
  const distribution: Record<string, number> = {
    '1': 0,
    '2': 0,
    '3': 0,
    '4': 0,
    '5': 0,
  };

  let sum = 0;
  let validCount = 0;

  for (const score of scores) {
    if (score >= 1 && score <= 5) {
      distribution[String(score)] = (distribution[String(score)] || 0) + 1;
      sum += score;
      validCount++;
    }
  }

  const averageScore = validCount > 0 ? Number((sum / validCount).toFixed(2)) : 0;

  return {
    averageScore,
    totalRatings: validCount,
    distribution,
  };
}

export class AnalyticsService {
  async getSurveySummary(surveyId: string, requestingUserId: string) {
    // 1. Fetch survey with ordered questions and question options
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

    // 2. Ownership verification (BR-10, AC-22, TEST-29)
    if (survey.ownerId !== requestingUserId) {
      throw new AppError(403, 'FORBIDDEN_OWNERSHIP', 'Access denied. You do not own this survey.');
    }

    // 3. Count total responses for this survey (handled gracefully if 0)
    const totalResponses = await prisma.response.count({
      where: { surveyId },
    });

    // 4. Compute aggregate metrics per question
    const questionsSummary = await Promise.all(
      survey.Question.map(async (q) => {
        if (q.type === QuestionType.RATING) {
          const ratingAnswers = await prisma.answer.findMany({
            where: {
              questionId: q.id,
              ratingValue: { not: null },
            },
            select: { ratingValue: true },
          });

          const scores = ratingAnswers.map((a) => a.ratingValue as number);
          const summary = computeRatingSummary(scores);

          return {
            questionId: q.id,
            prompt: q.text,
            questionType: q.type,
            summary,
          };
        }

        if (q.type === QuestionType.SINGLE_CHOICE) {
          const choiceAnswers = await prisma.answer.findMany({
            where: {
              questionId: q.id,
              selectedOptionId: { not: null },
            },
            select: { selectedOptionId: true },
          });

          const totalSelections = choiceAnswers.length;
          const countsByOption = new Map<string, number>();

          choiceAnswers.forEach((a) => {
            if (a.selectedOptionId) {
              countsByOption.set(a.selectedOptionId, (countsByOption.get(a.selectedOptionId) || 0) + 1);
            }
          });

          const optionsSummary = q.QuestionOption.map((opt) => {
            const count = countsByOption.get(opt.id) || 0;
            const percentage =
              totalSelections > 0 ? Number(((count / totalSelections) * 100).toFixed(1)) : 0;

            return {
              optionId: opt.id,
              label: opt.label,
              count,
              percentage,
            };
          });

          return {
            questionId: q.id,
            prompt: q.text,
            questionType: q.type,
            summary: {
              totalSelections,
              options: optionsSummary,
            },
          };
        }

        // SHORT_TEXT
        const textAnswers = await prisma.answer.findMany({
          where: {
            questionId: q.id,
            textValue: { not: null },
          },
          select: { textValue: true },
        });

        const validTexts = textAnswers
          .map((a) => a.textValue as string)
          .filter((t) => t && t.trim().length > 0);

        return {
          questionId: q.id,
          prompt: q.text,
          questionType: q.type,
          summary: {
            totalAnswers: validTexts.length,
            answers: validTexts,
          },
        };
      })
    );

    // 5. Zero respondent-identifying information (AC-21, NFR-12)
    return {
      surveyId: survey.id,
      title: survey.title,
      status: survey.status,
      totalResponses,
      questions: questionsSummary,
    };
  }
}

export const analyticsService = new AnalyticsService();
