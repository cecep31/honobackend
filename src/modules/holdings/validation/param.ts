import { z } from 'zod';

import { BIGINT_ID_STRING_CHARS_MAX } from '../../../utils/validationLimits';

export const holdingIdSchema = z.object({
  id: z.string().regex(/^\d+$/).max(BIGINT_ID_STRING_CHARS_MAX),
});
