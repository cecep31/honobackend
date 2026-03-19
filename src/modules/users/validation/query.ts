import { z } from 'zod';
import { safeLimit, safeOffset } from '../../../utils/request';

/** Query for list/paginated endpoints: GET /, GET /:id/followers, GET /:id/following */
export const listUsersQuerySchema = z.object({
  offset: z
    .string()
    .optional()
    .transform((v) => safeOffset(v, 0)),
  limit: z
    .string()
    .optional()
    .transform((v) => safeLimit(v, 10)),
  search: z.string().optional(),
  q: z.string().optional(),
  orderBy: z.string().optional(),
  orderDirection: z.enum(['asc', 'desc']).optional().default('desc'),
});

/** Query for GET /me - include profile or not */
export const meQuerySchema = z.object({
  profile: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type MeQuery = z.infer<typeof meQuerySchema>;
