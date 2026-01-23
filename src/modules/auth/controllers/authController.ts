import { Hono } from "hono";
import { authService, userService } from "../../../services/index";
import { auth } from "../../../middlewares/auth";
import config from "../../../config";
import axios from "axios";
import type { GithubUser } from "../../../types/auth";
import { setCookie, deleteCookie } from "hono/cookie";
import { rateLimiter } from "hono-rate-limiter";
import { validateRequest } from "../../../middlewares/validateRequest";
import type { Variables } from "../../../types/context";
import { sendSuccess } from "../../../utils/response";
import { Errors } from "../../../utils/error";
import {
  emailSchema,
  loginSchema,
  registerSchema,
  updatePasswordSchema,
  usernameSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validation/auth";

export const authController = new Hono<{ Variables: Variables }>();

authController.get("/oauth/github", async (c) => {
  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.append("client_id", config.github.CLIENT_ID);
  authUrl.searchParams.append("redirect_uri", config.github.REDIRECT_URI);
  authUrl.searchParams.append("scope", "user:email");

  return c.redirect(authUrl.toString());
});

authController.get("/oauth/github/callback", async (c) => {
  const code = c.req.query("code");
  if (!code) {
    throw Errors.InvalidInput("code", "code not found");
  }
  const token = await authService.getGithubToken(code);

  try {
    // Get user data from GitHub API
    const userResponse = await axios.get<GithubUser>(
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
        const emailsResponse = await axios.get<
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
    const jwtToken = await authService.signInWithGithub(githubUserData);
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
});

//login
authController.post(
  "/login",
  rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 7, // Limit each IP to 7 requests per `window` (here, per 15 minutes).
    standardHeaders: "draft-6", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
    keyGenerator: (c) =>
      c.req.header("x-forwarded-for") ||
      c.req.header("x-real-ip") ||
      c.req.header("cf-connecting-ip") ||
      "unknown",
  }),
  validateRequest("json", loginSchema),
  async (c) => {
    const body = c.req.valid("json");
    const { email, password } = body;
    const token = await authService.signIn(
      email,
      password,
      c.req.header("User-Agent") ?? "",
    );
    return sendSuccess(c, token, "Login successful");
  },
);

authController.post(
  "/register",
  validateRequest("json", registerSchema),
  async (c) => {
    const body = c.req.valid("json");
    const token = await authService.signUp(body);
    return sendSuccess(c, token, "User created successfully", 201);
  },
);

// check username exists
authController.get(
  "/username/:username",
  validateRequest("param", usernameSchema),
  async (c) => {
    const username = c.req.valid("param").username;
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

authController.post("/refresh-token", async (c) => {
  const body = await c.req.json();
  const refreshToken = body.refresh_token;
  if (!refreshToken) {
    throw Errors.InvalidInput("refresh_token", "Refresh token is required");
  }
  const result = await authService.refreshToken(refreshToken);
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
    const result = await authService.updatePassword(
      body.old_password,
      body.new_password,
      user.user_id,
    );
    return sendSuccess(c, result, "Password updated successfully");
  },
);

// Forgot password - request password reset
authController.post(
  "/forgot-password",
  rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 3, // Limit each IP to 3 requests per 15 minutes
    standardHeaders: "draft-6",
    keyGenerator: (c) =>
      c.req.header("x-forwarded-for") ||
      c.req.header("x-real-ip") ||
      c.req.header("cf-connecting-ip") ||
      "unknown",
  }),
  validateRequest("json", forgotPasswordSchema),
  async (c) => {
    const body = c.req.valid("json");
    const result = await authService.requestPasswordReset(body.email);
    return sendSuccess(c, result, result.message);
  },
);

// Reset password - actually reset the password with token
authController.post(
  "/reset-password",
  rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5, // Limit each IP to 5 requests per 15 minutes
    standardHeaders: "draft-6",
    keyGenerator: (c) =>
      c.req.header("x-forwarded-for") ||
      c.req.header("x-real-ip") ||
      c.req.header("cf-connecting-ip") ||
      "unknown",
  }),
  validateRequest("json", resetPasswordSchema),
  async (c) => {
    const body = c.req.valid("json");
    const result = await authService.resetPassword(
      body.token,
      body.new_password,
    );
    return sendSuccess(c, result, result.message);
  },
);
