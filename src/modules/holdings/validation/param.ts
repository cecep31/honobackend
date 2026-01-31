import { z } from "zod";

export const holdingIdSchema = z.object({
  id: z.string().regex(/^\d+$/),
});
