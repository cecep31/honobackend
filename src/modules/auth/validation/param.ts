import { z } from 'zod';
import { MAX_EMAIL_LENGTH } from '../../../utils/validationLimits';

export const emailSchema = z.object({
  email: z.string().email().max(MAX_EMAIL_LENGTH),
});
