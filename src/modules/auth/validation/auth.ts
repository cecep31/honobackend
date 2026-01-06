import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(5).max(254),
  password: z.string().min(6).max(25),
});

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters long")
    .max(20, "Username must not exceed 20 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    ),
  email: z.string().email(),
  password: z.string().min(6),
});

export type UserSignup = z.infer<typeof registerSchema>;

export const usernameSchema = z.object({
  username: z.string().min(5),
});

export const emailSchema = z.object({
  email: z.string().email(),
});

export const updatePasswordSchema = z
  .object({
    old_password: z.string(),
    new_password: z.string(),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "password not match",
    path: ["confirm_password"],
  });
