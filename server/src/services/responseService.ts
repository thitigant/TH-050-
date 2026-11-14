import crypto from 'crypto';
import { prisma } from '../db/prisma.js';
import { SubmitAnswerInput } from '../validators/responseValidator.js';
import { SurveyStatus, QuestionType, Prisma } from '@prisma/client';
import { AppError } from '../utils/errors.js';

export class ResponseService {
  async submitResponse(surveyId: string, respondentId: string, answersInput: SubmitAnswerInput[]) {
    // 1. Fetch survey with all its questions and options
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        Question: {
          include: {
            QuestionOption: true,
          },
        },
      },
    });

    if (!survey) {
      throw new AppError(404, 'SURVEY_NOT_FOUND', 'Survey not found');
    }

    // 2. Prevent Owner conflict of interest (BR-07, TEST-21, TEST-27)
    if (survey.ownerId === respondentId) {
      throw new AppError(403, 'OWNER_CANNOT_RESPOND', 'Survey owner cannot submit responses to their own survey');
    }

    // 3. Zero Draft Leakage (NFR-11):
    // DRAFT surveys are strictly private to the owner. Non-owners receive 404 SURVEY_NOT_FOUND
    // to prevent disclosing the existence or lifecycle state of unreleased drafts.
    if (survey.status === SurveyStatus.DRAFT) {
      throw new AppError(404, 'SURVEY_NOT_FOUND', 'Survey not found');
    }

    // 4. Survey must have status PUBLISHED to accept responses (BR-05, TEST-19)
    if (survey.status !== SurveyStatus.PUBLISHED) {
      throw new AppError(
        400,
        'SURVEY_NOT_ACCEPTING_RESPONSES',
        'Survey is not currently accepting responses'
      );
    }

    // 5. Check deadline if configured
    if (survey.closesAt && survey.closesAt <= new Date()) {
      throw new AppError(400, 'SURVEY_NOT_ACCEPTING_RESPONSES', 'Survey response deadline has passed');
    }

    // 6. Pre-flight duplicate check (BR-06, AC-17, TEST-14)
    const existingResponse = await prisma.response.findUnique({
      where: {
        surveyId_respondentId: {
          surveyId,
          respondentId,
        },
      },
      select: { id: true },
    });

    if (existingResponse) {
      throw new AppError(409, 'DUPLICATE_SUBMISSION', 'You have already submitted a response to this survey');
    }

    // 7. Validate answers against survey questions
    const questionMap = new Map(survey.Question.map((q) => [q.id, q]));
    const seenQuestionIds = new Set<string>();

    for (const ans of answersInput) {
      const q = questionMap.get(ans.questionId);
      if (!q) {
        throw new AppError(422, 'INVALID_QUESTION', `Question '${ans.questionId}' does not belong to this survey`);
      }

      if (seenQuestionIds.has(ans.questionId)) {
        throw new AppError(422, 'DUPLICATE_QUESTION_ANSWER', `Multiple answers provided for question '${ans.questionId}'`);
      }
      seenQuestionIds.add(ans.questionId);

      // Check for alias conflict between ratingValue and numericValue
      if (
        ans.ratingValue !== null &&
        ans.ratingValue !== undefined &&
        ans.numericValue !== null &&
        ans.numericValue !== undefined &&
        ans.ratingValue !== ans.numericValue
      ) {
        throw new AppError(422, 'INVALID_PAYLOAD', 'Conflicting values provided for ratingValue and numericValue');
      }

      // Validate per question type
      if (q.type === QuestionType.RATING) {
        const rating = ans.ratingValue ?? ans.numericValue;
        if (rating !== null && rating !== undefined) {
          if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
            throw new AppError(422, 'RATING_OUT_OF_RANGE', 'Rating answer must be an integer between 1 and 5');
          }
        }
      } else if (q.type === QuestionType.SINGLE_CHOICE) {
        if (ans.selectedOptionId) {
          const validOption = q.QuestionOption.some((opt) => opt.id === ans.selectedOptionId);
          if (!validOption) {
            throw new AppError(422, 'INVALID_OPTION_SELECTED', 'Selected option is not valid for this question');
          }
        }
      } else if (q.type === QuestionType.SHORT_TEXT) {
        if (ans.textValue !== null && ans.textValue !== undefined && typeof ans.textValue !== 'string') {
          throw new AppError(422, 'INVALID_TEXT_ANSWER', 'Text answer must be a string');
        }
      }
    }

    // 7. Verify all required questions have valid, non-empty answers (TEST-32)
    for (const q of survey.Question) {
      if (!q.isRequired) continue;

      const ans = answersInput.find((a) => a.questionId === q.id);
      if (!ans) {
        throw new AppError(422, 'EMPTY_REQUIRED_ANSWER', `Missing answer for required question: '${q.text}'`);
      }

      if (q.type === QuestionType.RATING) {
        const val = ans.ratingValue ?? ans.numericValue;
        if (val === null || val === undefined) {
          throw new AppError(422, 'EMPTY_REQUIRED_ANSWER', `Rating is required for question: '${q.text}'`);
        }
      } else if (q.type === QuestionType.SINGLE_CHOICE) {
        if (!ans.selectedOptionId || ans.selectedOptionId.trim().length === 0) {
          throw new AppError(422, 'EMPTY_REQUIRED_ANSWER', `Selection is required for question: '${q.text}'`);
        }
      } else if (q.type === QuestionType.SHORT_TEXT) {
        if (!ans.textValue || ans.textValue.trim().length === 0) {
          throw new AppError(422, 'EMPTY_REQUIRED_ANSWER', `Text is required for question: '${q.text}'`);
        }
      }
    }

    // 8. Prepare entity records for atomic write (filtering out empty answers for optional questions)
    const responseId = `rsp_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const answersData: Array<{
      id: string;
      questionId: string;
      selectedOptionId: string | null;
      ratingValue: number | null;
      textValue: string | null;
    }> = [];

    for (const ans of answersInput) {
      const q = questionMap.get(ans.questionId)!;
      const ratingValue = q.type === QuestionType.RATING ? (ans.ratingValue ?? ans.numericValue ?? null) : null;
      const selectedOptionId = q.type === QuestionType.SINGLE_CHOICE ? (ans.selectedOptionId ?? null) : null;
      const textValue = q.type === QuestionType.SHORT_TEXT ? (ans.textValue ? ans.textValue.trim() : null) : null;

      // Skip storing empty rows for optional questions if no answer value was given
      const hasValue = ratingValue !== null || selectedOptionId !== null || (textValue !== null && textValue.length > 0);
      if (!hasValue && !q.isRequired) {
        continue;
      }

      answersData.push({
        id: `ans_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
        questionId: ans.questionId,
        selectedOptionId,
        ratingValue,
        textValue,
      });
    }

    // 9. Atomic nested write backed by DB composite unique constraint @@unique([surveyId, respondentId])
    try {
      const created = await prisma.response.create({
        data: {
          id: responseId,
          surveyId,
          respondentId,
          submittedAt: new Date(),
          Answer: {
            create: answersData,
          },
        },
      });

      return {
        responseId: created.id,
        surveyId: created.surveyId,
        submittedAt: created.submittedAt,
        answersRecorded: answersData.length,
      };
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError(409, 'DUPLICATE_SUBMISSION', 'You have already submitted a response to this survey');
      }
      throw error;
    }
  }

  async getMyResponseForSurvey(surveyId: string, respondentId: string) {
    const response = await prisma.response.findUnique({
      where: {
        surveyId_respondentId: {
          surveyId,
          respondentId,
        },
      },
      include: {
        Answer: {
          include: {
            Question: {
              select: {
                id: true,
                text: true,
                type: true,
                displayOrder: true,
              },
            },
            QuestionOption: {
              select: {
                id: true,
                label: true,
                displayOrder: true,
              },
            },
          },
          orderBy: {
            Question: {
              displayOrder: 'asc',
            },
          },
        },
        Survey: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
          },
        },
      },
    });

    if (!response) {
      throw new AppError(404, 'RESPONSE_NOT_FOUND', 'No submission found for this survey');
    }

    return response;
  }

  async getResponseById(responseId: string, requestingUserId: string) {
    // Privacy Guarantee (BR-08, TEST-28):
    // Scoped directly by id AND respondentId to prevent loading another user's answers,
    // and returns 404 to avoid disclosing whether a foreign response ID exists.
    const response = await prisma.response.findFirst({
      where: {
        id: responseId,
        respondentId: requestingUserId,
      },
      include: {
        Answer: {
          include: {
            Question: {
              select: {
                id: true,
                text: true,
                type: true,
                displayOrder: true,
              },
            },
            QuestionOption: {
              select: {
                id: true,
                label: true,
                displayOrder: true,
              },
            },
          },
          orderBy: {
            Question: {
              displayOrder: 'asc',
            },
          },
        },
        Survey: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
      },
    });

    if (!response) {
      throw new AppError(404, 'RESPONSE_NOT_FOUND', 'Response not found or access denied');
    }

    return response;
  }
}

export const responseService = new ResponseService();
