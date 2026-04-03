import { z } from 'zod';
import { safeLimit, safeOffset } from '../../../utils/request';

export const listNotificationsQuerySchema = z.object({
  offset: z
    .string()
    .optional()
    .transform((v) => safeOffset(v, 0)),
  limit: z
    .string()
    .optional()
    .transform((v) => safeLimit(v, 20)),
  unread: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
