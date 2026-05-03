import { z } from 'zod';
import {
  MAX_CHAT_CONTENT_LENGTH,
  MAX_CHAT_ROLE_LENGTH,
  MAX_MODEL_ID_LENGTH,
} from '../../../utils/validationLimits';

export const createConversationSchema = z.object({
  title: z.string().min(1).max(255).optional(),
});

export const createMessageSchema = z.object({
  content: z.string().min(1).max(MAX_CHAT_CONTENT_LENGTH),
  role: z.string().max(MAX_CHAT_ROLE_LENGTH).optional().default('user'),
  model: z.string().max(MAX_MODEL_ID_LENGTH).optional(),
  temperature: z.number().min(0).max(2).default(0.7),
});

export const createConversationStreamSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).max(MAX_CHAT_CONTENT_LENGTH),
  model: z.string().max(MAX_MODEL_ID_LENGTH).optional(),
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
