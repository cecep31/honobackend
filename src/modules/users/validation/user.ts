import { z } from "zod";

export const userIdSchema = z.object({
  id: z.string().uuid(),
});

export const createUserSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  username: z.string().min(5),
  email: z.string().email(),
  password: z.string().min(8),
  image: z.string().optional().default("/images/default.jpg"),
  is_super_admin: z.boolean().optional().default(false),
});

export type UserCreateBody = z.infer<typeof createUserSchema>;
