import { z } from "zod";

export const postByUsernameSlugSchema = z.object({
  username: z.string().min(5).max(20),
  slug: z.string().min(5).max(255),
});

export const postIdSchema = z.object({
  id: z.string().uuid(),
});

export const createPostSchema = z.object({
  title: z.string().min(5).max(255),
  body: z.string().min(20).max(10000),
  slug: z.string().min(5).max(255),
  tags: z.array(z.string()).optional().default([]),
  photo_url: z.string().optional().default("/images/default.jpg"),
  published: z.boolean().optional().default(true),
});

export const updatePostSchema = z.object({
  title: z.string().min(5).max(255).optional(),
  body: z.string().min(20).max(10000).optional(),
  slug: z.string().min(5).max(255).optional(),
  tags: z.array(z.string()).optional(),
  photo_url: z.string().optional(),
  published: z.boolean().optional(),
});
