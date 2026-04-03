import { z } from 'zod';

export const createConversationSchema = z.object({
  title: z.string().min(1).max(255).optional(),
});

export const createMessageSchema = z.object({
  content: z.string().min(1),
  role: z.string().optional().default('user'),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
});

export const createConversationStreamSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
});

export const updateConversationSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    is_pinned: z.boolean().optional(),
  })
  .refine((value) => value.title !== undefined || value.is_pinned !== undefined, {
    message: 'At least one field must be provided',
  });

export type CreateConversationBody = z.infer<typeof createConversationSchema>;
export type CreateMessageBody = z.infer<typeof createMessageSchema> & {
  conversation_id: string;
};
export type CreateConversationStreamBody = z.infer<typeof createConversationStreamSchema>;
export type UpdateConversationBody = z.infer<typeof updateConversationSchema>;
