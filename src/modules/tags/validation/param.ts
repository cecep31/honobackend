import { z } from 'zod';

export const tagIdParamSchema = z.object({
  tagId: z.coerce.number().int().positive(),
});
