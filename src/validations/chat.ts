import { z } from "zod";

export const createConversationSchema = z.object({
  title: z.string().min(1).max(255),
});

export const conversationIdSchema = z.object({
  id: z.string().uuid(),
});

export const conversationParamSchema = z.object({
  conversationId: z.string().uuid(),
});

export const createMessageSchema = z.object({
  content: z.string().min(1),
  role: z.string().optional().default("user"),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
});
