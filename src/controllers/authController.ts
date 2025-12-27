import { Hono } from "hono";
import { authService } from "../pkg/service";
import { auth } from "../middlewares/auth";
import config from "../config";
import axios from "axios";
import type { GithubUser } from "../types/user";
import { setCookie } from "hono/cookie";
import { rateLimiter } from "hono-rate-limiter";
import { validateRequest } from "../middlewares/validateRequest";
import type { Variables } from "../types/context";
import { sendSuccess } from "../utils/response";
import { Errors } from "../utils/error";
import {
  loginSchema,
  registerSchema,
  updatePasswordSchema,
  usernameSchema,
} from "../validations/auth";

export const authController = new Hono<{ Variables: Variables }>();

authController.get("/oauth/github", async (c) => {
  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.append("client_id", config.github.CLIENT_ID);
  authUrl.searchParams.append("redirect_uri", config.github.REDIRECT_URI);
  authUrl.searchParams.append("scope", "user");

  return c.redirect(authUrl.toString());
});

authController.get("/oauth/github/callback", async (c) => {
  const code = c.req.query("code");
  if (!code) {
    throw Errors.InvalidInput("code", "code not found");
  }
  const token = await authService.getGithubToken(code);

  try {
    const userResponse = await axios.get<GithubUser>(
      "https://api.github.com/user",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const jwtToken = await authService.signInWithGithub(userResponse.data.id);
    setCookie(c, "token", jwtToken.access_token, {
      domain: "pilput.dev",
      maxAge: 60 * 60 * 5,
      sameSite: "Strict",
    });
    return c.redirect("https://pilput.dev");
  } catch (error) {
    console.error("Github OAuth error:", error);
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
    keyGenerator: (_c) => "<unique_key>", // Method to generate custom identifiers for clients.
  }),
  validateRequest("json", loginSchema),
  async (c) => {
    const body = c.req.valid("json");
    const { email, password } = body;
    const token = await authService.signIn(
      email,
      password,
      c.req.header("User-Agent") ?? ""
    );
    return sendSuccess(c, token, "Login successful");
  }
);

authController.post(
  "register",
  validateRequest("json", registerSchema),
  async (c) => {
    const body = c.req.valid("json");
    const token = await authService.signUp(body);
    return sendSuccess(c, token, "User created successfully", 201);
  }
);

authController.get(
  "/username/:username",
  validateRequest("param", usernameSchema),
  async (c) => {
    const username = c.req.valid("param").username;
    const exists = await authService.checkUsername(username);
    return sendSuccess(c, { exists }, "Username check completed");
  }
);

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
      user.user_id
    );
    return sendSuccess(c, result, "Password updated successfully");
  }
);
