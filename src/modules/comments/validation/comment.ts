import { z } from "zod";

export const createCommentSchema = z.object({
  text: z.string().min(1, "Comment text is required").max(5000, "Comment text is too long"),
  post_id: z.string().uuid("Invalid post ID"),
  parent_comment_id: z.number().int().positive().optional(),
});

export const updateCommentSchema = z.object({
  text: z.string().min(1, "Comment text is required").max(5000, "Comment text is too long"),
});

export const getCommentsQuerySchema = z.object({
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("20"),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type GetCommentsQuery = z.infer<typeof getCommentsQuerySchema>;
