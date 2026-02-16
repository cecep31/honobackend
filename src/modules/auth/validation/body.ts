import { z } from "zod";
import { validatePassword } from "../../../utils/password";

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
  password: z.string().superRefine((password, ctx) => {
    const result = validatePassword(password);
    if (!result.isValid) {
      result.errors.forEach((error) => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: error,
        });
      });
    }
  }),
});

export type UserSignup = z.infer<typeof registerSchema>;

export const usernameSchema = z.object({
  username: z.string().min(5),
});

export const checkUsernameSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters long")
    .max(20, "Username must not exceed 20 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    ),
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
  })
  .refine((data) => {
    const result = validatePassword(data.new_password);
    return result.isValid;
  }, {
    message: "Password does not meet strength requirements",
    path: ["new_password"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token is required"),
    new_password: z.string(),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  })
  .refine((data) => {
    const result = validatePassword(data.new_password);
    return result.isValid;
  }, {
    message: "Password does not meet strength requirements",
    path: ["new_password"],
  });

export const updateEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const updateUserSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters long")
      .max(20, "Username must not exceed 20 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores"
      )
      .optional(),
    email: z.string().email("Invalid email address").optional(),
    password: z.string().min(6).optional(),
    confirm_password: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.password && data.confirm_password) {
        return data.password === data.confirm_password;
      }
      return true;
    },
    {
      message: "Passwords do not match",
      path: ["confirm_password"],
    }
  )
  .refine(
    (data) => {
      if (data.password || data.confirm_password) {
        return !!(data.password && data.confirm_password);
      }
      return true;
    },
    {
      message: "Both password and confirm_password are required",
      path: ["password"],
    }
  );
