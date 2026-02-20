import { Hono } from "hono";
import { authService, userService, activityService } from "../../../services/index";
import { auth } from "../../../middlewares/auth";
import config from "../../../config";
import { externalApiClient } from "../../../utils/httpClient";
import type { GithubUser } from "../../../types/auth";
import { setCookie, deleteCookie } from "hono/cookie";
import { rateLimiter } from "hono-rate-limiter";
import { validateRequest } from "../../../middlewares/validateRequest";
import type { Variables } from "../../../types/context";
import { sendSuccess } from "../../../utils/response";
import { Errors } from "../../../utils/error";
import { getClientIp } from "../../../utils/request";
import {
  activityLogsQuerySchema,
  activityLogsRecentQuerySchema,
  emailSchema,
  failedLoginsQuerySchema,
  githubCallbackQuerySchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  updatePasswordSchema,
  usernameSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  checkUsernameSchema,
} from "../validation";

export const authController = new Hono<{ Variables: Variables }>();

/**
 * Factory for creating rate limiter middleware with consistent IP key generation
 */
function createRateLimiter(windowMs: number, limit: number) {
  return rateLimiter({
    windowMs,
    limit,
    standardHeaders: "draft-6",
    keyGenerator: (c) =>
      c.req.header("x-forwarded-for") ||
      c.req.header("x-real-ip") ||
      c.req.header("cf-connecting-ip") ||
      "unknown",
  });
}

authController.get("/oauth/github", async (c) => {
  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.append("client_id", config.github.CLIENT_ID);
  authUrl.searchParams.append("redirect_uri", config.github.REDIRECT_URI);
  authUrl.searchParams.append("scope", "user:email");

  return c.redirect(authUrl.toString());
});

authController.get(
  "/oauth/github/callback",
  validateRequest("query", githubCallbackQuerySchema),
  async (c) => {
    const { code } = c.req.valid("query");
    const token = await authService.getGithubToken(code);

    try {
      // Get user data from GitHub API
      const userResponse = await externalApiClient.get<GithubUser>(
        "https://api.github.com/user",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      // If email is null, try to get it from the emails endpoint
      let githubUserData = userResponse.data;
      if (!githubUserData.email) {
        try {
          const emailsResponse = await externalApiClient.get<
            Array<{ email: string; primary: boolean; verified: boolean }>
          >("https://api.github.com/user/emails", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          // Find primary email or first verified email
          const primaryEmail = emailsResponse.data.find(
            (e) => e.primary && e.verified,
          );
          const verifiedEmail = emailsResponse.data.find((e) => e.verified);
          if (primaryEmail) {
            githubUserData.email = primaryEmail.email;
          } else if (verifiedEmail) {
            githubUserData.email = verifiedEmail.email;
          }
        } catch (emailError) {
          // If we can't get email, continue with null email (will use fallback)
          console.warn("Could not fetch GitHub email:", emailError);
        }
      }

      // Sign in or create user with full GitHub user data
      const ipAddress = getClientIp(c);
      const userAgent = c.req.header("User-Agent");
      const jwtToken = await authService.signInWithGithub(
        githubUserData,
        ipAddress,
        userAgent,
      );
      setCookie(c, "token", jwtToken.access_token, {
        domain: "." + config.frontend.mainDomain,
        maxAge: 60 * 60 * 5, // 5 hours
        sameSite: "Strict",
      });
      return c.redirect(config.frontend.url);
    } catch (error) {
      console.error("Github OAuth error:", error);

      // If it's a business rule violation (e.g., email already used), return clearer error
      if (
        error instanceof Error &&
        error.message.includes("already registered")
      ) {
        throw Errors.BusinessRuleViolation(error.message);
      }

      throw Errors.Unauthorized();
    }
  },
);

//login
authController.post(
  "/login",
  createRateLimiter(15 * 60 * 1000, 7), // 7 requests per 15 minutes
  validateRequest("json", loginSchema),
  async (c) => {
    const body = c.req.valid("json");
    const { identifier, email, password } = body;
    const loginIdentifier = identifier ?? email ?? "";
    const ipAddress = getClientIp(c);
    const userAgent = c.req.header("User-Agent");
    const token = await authService.signIn(
      loginIdentifier,
      password,
      userAgent ?? "",
      ipAddress,
    );
    return sendSuccess(c, token, "Login successful");
  },
);

authController.post(
  "/register",
  validateRequest("json", registerSchema),
  async (c) => {
    const body = c.req.valid("json");
    const ipAddress = getClientIp(c);
    const userAgent = c.req.header("User-Agent");
    const token = await authService.signUp(body, ipAddress, userAgent);
    return sendSuccess(c, token, "User created successfully", 201);
  },
);

// check username exists
authController.post(
  "/check-username",
  validateRequest("json", checkUsernameSchema),
  async (c) => {
    const { username } = c.req.valid("json");
    const exists = await authService.checkUsername(username);
    return sendSuccess(c, { exists }, "Username check completed");
  },
);

authController.get(
  "/email/:email",
  validateRequest("param", emailSchema),
  async (c) => {
    const email = c.req.valid("param").email;
    const exists = await authService.checkEmail(email);
    return sendSuccess(c, { exists }, "Email check completed");
  },
);

authController.post("/refresh-token", validateRequest("json", refreshTokenSchema), async (c) => {
  const { refresh_token: refreshToken } = c.req.valid("json");
  const ipAddress = getClientIp(c);
  const userAgent = c.req.header("User-Agent");
  const result = await authService.refreshToken(
    refreshToken,
    ipAddress,
    userAgent,
  );
  return sendSuccess(c, result, "Token refreshed successfully");
});

authController.post("/logout", auth, async (c) => {
  deleteCookie(c, "token", {
    ...(config.frontend.mainDomain && { domain: config.frontend.mainDomain }),
    path: "/",
  });
  return sendSuccess(c, null, "Logged out successfully");
});

authController.get("/profile", auth, async (c) => {
  const user = c.get("user");
  const userProfile = await userService.getUserProfile(user.user_id);

  if (!userProfile) {
    throw Errors.NotFound("User");
  }

  return sendSuccess(c, userProfile, "User profile retrieved successfully");
});

authController.patch(
  "/password",
  auth,
  validateRequest("json", updatePasswordSchema),
  async (c) => {
  const body = c.req.valid("json");
  const user = c.get("user");
  const ipAddress = getClientIp(c);
  const userAgent = c.req.header("User-Agent");
  const result = await authService.updatePassword(
      body.old_password,
      body.new_password,
      user.user_id,
      ipAddress,
      userAgent,
    );
    return sendSuccess(c, result, "Password updated successfully");
  },
);

// Forgot password - request password reset
authController.post(
  "/forgot-password",
  createRateLimiter(15 * 60 * 1000, 3), // 3 requests per 15 minutes
  validateRequest("json", forgotPasswordSchema),
  async (c) => {
    const body = c.req.valid("json");
    const ipAddress = getClientIp(c);
    const userAgent = c.req.header("User-Agent");
    const result = await authService.requestPasswordReset(
      body.email,
      ipAddress,
      userAgent,
    );
    return sendSuccess(c, result, result.message);
  },
);

// Reset password - actually reset the password with token
authController.post(
  "/reset-password",
  createRateLimiter(15 * 60 * 1000, 5), // 5 requests per 15 minutes
  validateRequest("json", resetPasswordSchema),
  async (c) => {
    const body = c.req.valid("json");
    const ipAddress = getClientIp(c);
    const userAgent = c.req.header("User-Agent");
    const result = await authService.resetPassword(
      body.token,
      body.new_password,
      ipAddress,
      userAgent,
    );
    return sendSuccess(c, result, result.message);
  },
);

// Activity logs endpoints

// Get current user's activity logs
authController.get(
  "/activity-logs",
  auth,
  validateRequest("query", activityLogsQuerySchema),
  async (c) => {
    const user = c.get("user");
    const { limit, offset, activity_type, status } = c.req.valid("query");

    const logs = await activityService.getActivityLogs({
      userId: user.user_id,
      activityType: activity_type,
      status: status ?? undefined,
      limit,
      offset,
    });

    const total = await activityService.getActivityLogsCount({
      userId: user.user_id,
      activityType: activity_type,
      status: status ?? undefined,
    });

    return sendSuccess(
      c,
      {
        logs,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + logs.length < total,
        },
      },
      "Activity logs retrieved successfully",
    );
  },
);

// Get recent activity for current user
authController.get(
  "/activity-logs/recent",
  auth,
  validateRequest("query", activityLogsRecentQuerySchema),
  async (c) => {
    const user = c.get("user");
    const { limit } = c.req.valid("query");

    const logs = await activityService.getUserRecentActivity(
      user.user_id,
      limit,
    );

    return sendSuccess(c, logs, "Recent activity retrieved successfully");
  },
);

// Get failed login attempts for current user
authController.get(
  "/activity-logs/failed-logins",
  auth,
  validateRequest("query", failedLoginsQuerySchema),
  async (c) => {
    const user = c.get("user");
    const { since } = c.req.valid("query");

    const logs = await activityService.getFailedLoginAttempts(
      user.user_id,
      since,
    );

    return sendSuccess(
      c,
      { logs, count: logs.length },
      "Failed login attempts retrieved successfully",
    );
  },
);
