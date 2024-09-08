import { Hono } from "hono";
import { authservice } from "../pkg/service";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { auth } from "../middlewares/auth";
import type { jwtPayload } from "../types/auth";


const authController = new Hono();

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
  zValidator("param", z.object({ username: z.string().min(3) })),
  async (c) => {
    const username = c.req.valid("param").username;
    return c.json({ exsist: await authservice.checkUsername(username) });
  }
);

authController.put(
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
    const { new_password, old_password } = body;
    const user = c.get("jwtPayload") as jwtPayload;
    return c.json(
      await authservice.updatePassword(old_password, new_password, user.id)
    );
  }
);

export default authController;
