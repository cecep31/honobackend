import { z } from "zod";

export const userIdSchema = z.object({
  id: z.string().uuid(),
});

export const usernameParamSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
});

export const createUserSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
  email: z.string().email("Invalid email format"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be at most 100 characters"),
  image: z.string().url("Invalid image URL").optional().default("/images/default.jpg"),
  is_super_admin: z.boolean().optional().default(false),
});

export const updateUserSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(100).optional(),
  last_name: z.string().min(1, "Last name is required").max(100).optional(),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens")
    .optional(),
  email: z.string().email("Invalid email format").optional(),
  image: z.string().url("Invalid image URL").optional(),
  is_super_admin: z.boolean().optional(),
});

export const followUserSchema = z.object({
  following_id: z.string().uuid(),
});

export const updateProfileSchema = z.object({
  bio: z.string().max(500, "Bio must be at most 500 characters").optional(),
  phone: z.string().max(50, "Phone must be at most 50 characters").optional(),
  location: z.string().max(255, "Location must be at most 255 characters").optional(),
});

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export const updateUserImageSchema = z.object({
  image: z
    .instanceof(File, { message: "Image is required" })
    .refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
      ".jpg, .jpeg, .png and .webp files are accepted."
    ),
});

export type UserCreateBody = z.infer<typeof createUserSchema>;
export type UserUpdateBody = z.infer<typeof updateUserSchema>;
export type FollowUserBody = z.infer<typeof followUserSchema>;
export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
export type UpdateUserImageBody = z.infer<typeof updateUserImageSchema>;
