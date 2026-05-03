import { z } from 'zod';
import { safeLimit, safeOffset } from '../../../utils/request';
import {
  MAX_ORDER_BY_LENGTH,
  MAX_QUERY_SEARCH_LENGTH,
} from '../../../utils/validationLimits';

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
  search: z.string().max(MAX_QUERY_SEARCH_LENGTH).optional(),
  q: z.string().max(MAX_QUERY_SEARCH_LENGTH).optional(),
  orderBy: z.string().max(MAX_ORDER_BY_LENGTH).optional(),
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
