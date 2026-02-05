import { z } from "zod";

const safeNonNegativeInt = (v: string | undefined, fallback: number) => {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
};
const safeLimit = (v: string | undefined, fallback: number) => {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 1
    ? Math.min(100, Math.max(1, Math.floor(n)))
    : fallback;
};

/** Query for GET /oauth/github/callback */
export const githubCallbackQuerySchema = z.object({
  code: z.string().min(1, "code is required"),
});

/** Query for GET /activity-logs */
export const activityLogsQuerySchema = z.object({
  limit: z.string().optional().transform((v) => safeLimit(v, 20)),
  offset: z.string().optional().transform((v) => safeNonNegativeInt(v, 0)),
  activity_type: z
    .enum([
      "login",
      "login_failed",
      "logout",
      "register",
      "password_change",
      "password_reset_request",
      "password_reset",
      "token_refresh",
      "oauth_login",
      "oauth_login_failed",
    ])
    .optional(),
  status: z.enum(["success", "failure", "pending"]).optional(),
});

/** Query for GET /activity-logs/recent */
export const activityLogsRecentQuerySchema = z.object({
  limit: z.string().optional().transform((v) => safeLimit(v, 10)),
});

/** Query for GET /activity-logs/failed-logins */
const defaultSince = () => new Date(Date.now() - 24 * 60 * 60 * 1000);
export const failedLoginsQuerySchema = z.object({
  since: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return defaultSince();
      const d = new Date(v);
      return Number.isFinite(d.getTime()) ? d : defaultSince();
    }),
});

export type GithubCallbackQuery = z.infer<typeof githubCallbackQuerySchema>;
export type ActivityLogsQuery = z.infer<typeof activityLogsQuerySchema>;
export type ActivityLogsRecentQuery = z.infer<typeof activityLogsRecentQuerySchema>;
export type FailedLoginsQuery = z.infer<typeof failedLoginsQuerySchema>;
