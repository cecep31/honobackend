import { Hono } from "hono";
import { authService } from "../pkg/service";
import { z } from "zod";
import { auth } from "../middlewares/auth";
import { githubConfig } from "../config/github";
import axios from "axios";
import type { GithubUser } from "../types/user";
import { setCookie } from "hono/cookie";
import { rateLimiter } from "hono-rate-limiter";
import { validateRequest } from "../middlewares/validateRequest";
import type { Variables } from '../types/context'

const authController = new Hono<{ Variables: Variables }>();

authController.get("/oauth/github", async (c) => {
  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.append("client_id", githubConfig.CLIENT_ID);
  authUrl.searchParams.append("redirect_uri", githubConfig.REDIRECT_URI);
  authUrl.searchParams.append("scope", "user");

  return c.redirect(authUrl.toString());
});

authController.get("/oauth/github/callback", async (c) => {
  const code = c.req.query("code");
  if (!code) {
    return c.text("code not found", 403);
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
    console.log(error);
    return c.json(
      {
        message: "Failed to get user",
        success: false,
        requestId: c.get("requestId") || "N/A",
      },
      401
    );
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
  validateRequest(
    "json",
    z.object({
      email: z.string().min(5),
      password: z.string().min(6),
    })
  ),
  async (c) => {
    const body = c.req.valid("json");
    const { email, password } = body;
    const token = await authService.signIn(
      email,
      password,
      c.req.header("User-Agent") ?? ""
    );
    return c.json({
      data: {
        ...token,
      },
      message: "Login successful",
      success: true,
      requestId: c.get("requestId") || "N/A",
    });
  }
);

authController.post(
  "register",
  validateRequest(
    "json",
    z.object({
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
    })
  ),
  async (c) => {
    const body = c.req.valid("json");
    const token = await authService.signUp(body);
    return c.json({
      data: {
        ...token,
      },
      message: "User created successfully",
      success: true,
      requestId: c.get("requestId") || "N/A",
    });
  }
);

authController.get(
  "/username/:username",
  validateRequest("param", z.object({ username: z.string().min(5) })),
  async (c) => {
    const username = c.req.valid("param").username;
    return c.json({
      exsist: await authService.checkUsername(username),
      requestId: c.get("requestId") || "N/A",
    });
  }
);

authController.patch(
  "/password",
  auth,
  validateRequest(
    "json",
    z
      .object({
        old_password: z.string(),
        new_password: z.string(),
        confirm_password: z.string(),
      })
      .refine((data) => data.new_password === data.confirm_password, {
        message: "password not match",
        path: ["confirm_password"],
      })
  ),
  async (c) => {
    const body = c.req.valid("json");
    const user = c.get("user");
    const result = await authService.updatePassword(
      body.old_password,
      body.new_password,
      user.user_id
    );
    return c.json({
      success: true,
      message: "Password updated successfully",
      data: result,
      requestId: c.get("requestId") || "N/A",
    });
  }
);

export default authController;
