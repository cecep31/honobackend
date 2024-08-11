import { Hono } from "hono";
import { AuthService } from "../pkg/services/authService";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { auth } from "../middlewares/auth";
import type { jwtPayload } from "../types/auth";

const authservice = new AuthService();

export const authController = new Hono()
  .post(
    "/login",
    zValidator(
      "json",
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
      })
    ),
    async (c) => {
      const body = c.req.valid("json");
      const { email, password } = body;
      const token = await authservice.signIn(email, password);
      return c.json(token);
    }
  )
  .put(
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
