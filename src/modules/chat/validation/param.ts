import { z } from "zod";

export const conversationIdSchema = z.object({
  id: z.string().uuid(),
});

export const conversationParamSchema = z.object({
  conversationId: z.string().uuid(),
});
