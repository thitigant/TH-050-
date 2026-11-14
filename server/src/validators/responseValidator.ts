import { z } from 'zod';

export const submitAnswerSchema = z.object({
  questionId: z.string().min(1, 'Question ID is required'),
  selectedOptionId: z.string().nullable().optional(),
  ratingValue: z.number().int().nullable().optional(),
  numericValue: z.number().int().nullable().optional(), // Alias supported by API spec
  textValue: z.string().max(2000, 'Text answer cannot exceed 2000 characters').nullable().optional(),
});

export const submitResponseSchema = z.object({
  answers: z.array(submitAnswerSchema).default([]),
});

export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
export type SubmitResponseInput = z.infer<typeof submitResponseSchema>;
