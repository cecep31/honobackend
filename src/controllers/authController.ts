import { Hono } from "hono";
import { authservice } from "../pkg/service";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { auth } from "../middlewares/auth";
import type { jwtPayload } from "../types/auth";
import { githubConfig } from "../config/github";
import axios from "axios";
import type { GithubUser } from "../types/user";
import { setCookie } from "hono/cookie";

const authController = new Hono();

authController.get("/oauth/github", async (c) => {
  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.append("client_id", githubConfig.CLIENT_ID);
  authUrl.searchParams.append("redirect_uri", githubConfig.REDIRECT_URI);
  authUrl.searchParams.append("scope", "user");

  return c.redirect(authUrl.toString());
});

authController.get("/oauth/github/callback", async (c) => {
  const code = c.req.query("code") ?? "";
  if (!code) {
    return c.text("code not found", 403);
  }
  const token = await authservice.getGithubToken(code);

  try {
    const userResponse = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const response = userResponse.data as GithubUser;

    const jwtToken = await authservice.signInWithGithub(response.id);
    setCookie(c, "token", jwtToken.access_token, {
      domain: ".pilput.dev",
      maxAge: 60 * 60 * 5,
    });
    return c.redirect("https://pilput.dev");
  } catch (error) {
    console.log(error);
    return c.text("failed get user", 401);
  }
});

//login
authController.post(
  "/login",
  zValidator(
    "json",
    z.object({
      email: z.string(),
      password: z.string().min(6),
    })
  ),
  async (c) => {
    const body = c.req.valid("json");
    const { email, password } = body;
    const token = await authservice.signIn(email, password);
    return c.json(token);
  }
);

authController.post(
  "register",
  zValidator(
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
    const token = await authservice.signUp(body);
    return c.json(token);
  }
);

authController.get(
  "/username/:username",
  zValidator("param", z.object({ username: z.string().min(5) })),
  async (c) => {
    const username = c.req.valid("param").username;
    return c.json({ exsist: await authservice.checkUsername(username) });
  }
);

authController.patch(
  "/password",
  auth,
  zValidator(
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
    const user = c.get("jwtPayload") as jwtPayload;
    return c.json(
      await authservice.updatePassword(
        body.old_password,
        body.new_password,
        user.id
      )
    );
  }
);

export default authController;
