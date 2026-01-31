import { z } from "zod";

export const createCommentSchema = z.object({
  text: z
    .string()
    .min(1, "Comment text is required")
    .max(5000, "Comment text is too long"),
  post_id: z.string().uuid("Invalid post ID"),
  parent_comment_id: z
    .string()
    .uuid("Invalid parent comment ID")
    .optional(),
});

export const updateCommentSchema = z.object({
  text: z
    .string()
    .min(1, "Comment text is required")
    .max(5000, "Comment text is too long"),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
