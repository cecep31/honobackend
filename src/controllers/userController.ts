import { Hono } from "hono";
import { userService } from "../pkg/service";
import { auth } from "../middlewares/auth";
import { superAdmin } from "../middlewares/superAdmin";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { jwtPayload } from "../types/auth";

export const userController = new Hono()
  .get("/", auth, async (c) => {
    const users = await userService.getUsers();
    return c.json(users);
  })
  .get("/me", auth, async (c) => {
    const user = c.get("jwtPayload") as jwtPayload;
    const profile = Boolean(c.req.query("profile"));
    return c.json(await userService.gerUserMe(user.id, profile));
  })
  .get(
    "/:id",
    auth,
    zValidator("param", z.object({ id: z.string().uuid() })),
    async (c) => {
      const id = c.req.param("id");
      const user = await userService.gerUser(id);
      if (!user) {
        return c.text("User not found", 404);
      }
      return c.json(user);
    }
  )
  .post(
    "/",
    auth,
    superAdmin,
    zValidator(
      "json",
      z.object({
        first_name: z.string(),
        last_name: z.string(),
        username: z.string(),
        email: z.string().email(),
        password: z.string(),
        image: z.string().optional().default("/images/default.jpg"),
        issuperadmin: z.boolean().optional().default(false),
      })
    ),
    async (c) => {
      const body = c.req.valid("json");
      return c.json(await userService.addUser(body), 201);
    }
  )
  .delete("/:id", auth, superAdmin, async (c) => {
    const id = c.req.param("id");
    const user = await userService.deleteUser(id);
    return c.json(user);
  });
