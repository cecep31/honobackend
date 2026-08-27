import { z } from 'zod';

export const createTagSchema = z.object({
  name: z.string().trim().min(1, 'Tag name is required').max(30, 'Tag name must not exceed 30 characters'),
});

export const updateTagSchema = z.object({
  name: z.string().trim().min(1, 'Tag name is required').max(30, 'Tag name must not exceed 30 characters'),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
