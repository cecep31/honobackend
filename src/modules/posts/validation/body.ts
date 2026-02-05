import { z } from "zod";

/** Max length for WYSIWYG/HTML body (tags add ~30–50% overhead vs plain text). */
const BODY_MAX_LENGTH = 500_000;

export const createPostSchema = z.object({
  title: z.string().min(5).max(255),
  body: z.string().min(20).max(BODY_MAX_LENGTH),
  slug: z.string().min(5).max(255),
  tags: z.array(z.string()).optional().default([]),
  photo_url: z.string().optional().nullable(),
  published: z.boolean().optional().default(true),
});

export const updatePostSchema = z.object({
  title: z.string().min(5).max(255).optional(),
  body: z.string().min(20).max(BODY_MAX_LENGTH).optional(),
  slug: z.string().min(5).max(255).optional(),
  tags: z.array(z.string()).optional(),
  photo_url: z.string().optional(),
  published: z.boolean().optional(),
});

export type PostCreateBody = z.infer<typeof createPostSchema>;
