import { z } from 'zod';

export const dateRangeQuerySchema = z.object({
  startDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid start date format',
    }),
  endDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid end date format',
    }),
  period: z.enum(['day', 'week', 'month', 'year']).optional().default('month'),
});

export const reportTypeQuerySchema = z.object({
  type: z.enum(['overview', 'users', 'posts', 'engagement']).optional().default('overview'),
});

export const userReportQuerySchema = dateRangeQuerySchema.extend({
  limit: z.coerce.number().min(1).max(100).optional().default(10),
});

export const postReportQuerySchema = dateRangeQuerySchema.extend({
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  tagId: z.coerce.number().optional(),
});

export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;
export type ReportTypeQuery = z.infer<typeof reportTypeQuerySchema>;
export type UserReportQuery = z.infer<typeof userReportQuerySchema>;
export type PostReportQuery = z.infer<typeof postReportQuerySchema>;
