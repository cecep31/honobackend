import { z } from 'zod';
import { safeLimit, safeOffset } from '../../../utils/request';
import {
  MAX_ORDER_BY_LENGTH,
  MAX_QUERY_SEARCH_LENGTH,
} from '../../../utils/validationLimits';

/** Query for GET /conversations (paginated list) */
export const listConversationsQuerySchema = z.object({
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

export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;
