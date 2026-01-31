import { z } from "zod";

export const postByUsernameSlugSchema = z.object({
  username: z.string().min(5).max(20),
  slug: z.string().min(5).max(255),
});

export const postIdSchema = z.object({
  id: z.string().uuid(),
});
