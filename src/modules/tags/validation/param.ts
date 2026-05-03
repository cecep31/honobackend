import { z } from 'zod';

import { SERIAL_INT_MAX } from '../../../utils/validationLimits';

export const tagIdParamSchema = z.object({
  tagId: z.coerce.number().int().positive().max(SERIAL_INT_MAX),
});
