import { z } from 'zod';

export const questionInputSchema = z
  .object({
    text: z.string().trim().min(1, 'Question text cannot be empty').max(500, 'Question text too long'),
    type: z.enum(['SINGLE_CHOICE', 'RATING', 'SHORT_TEXT']),
    isRequired: z.boolean().optional().default(true),
    displayOrder: z.number().int().optional(),
    options: z.array(z.string().trim().min(1, 'Option label cannot be empty')).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.type === 'SINGLE_CHOICE') {
      if (!val.options || val.options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Single choice questions must have at least 2 options',
          path: ['options'],
        });
      } else if (val.options.length > 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Single choice questions cannot exceed 10 options',
          path: ['options'],
        });
      } else {
        const uniqueSet = new Set(val.options.map((opt) => opt.toLowerCase()));
        if (uniqueSet.size !== val.options.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Single choice options must be unique',
            path: ['options'],
          });
        }
      }
    }
  });

export const createSurveySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title must be between 1 and 150 characters')
    .max(150, 'Title cannot exceed 150 characters'),
  description: z.string().trim().max(1000).optional(),
  responseMode: z.enum(['IDENTIFIED', 'ANONYMOUS']).optional().default('IDENTIFIED'),
  questions: z
    .array(questionInputSchema)
    .max(30, 'A survey can have at most 30 questions')
    .optional()
    .default([]),
});

export type CreateSurveyInput = z.infer<typeof createSurveySchema>;
