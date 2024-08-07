import { Hono } from "hono";
import { UserService } from "../pkg/services/userServices";
import { auth } from "../middlewares/auth";
import { superAdmin } from "../middlewares/superAdmin";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { jwtPayload } from "../types/auth";

const userservice = new UserService();

export const userController = new Hono()
  .get("/", auth, async (c) => {
    return c.json(await userservice.getUsers());
  })
  .get("/me", auth, async (c) => {
    const user = c.get("jwtPayload") as jwtPayload;
    const profile = c.req.query("profile") ? true : false;
    return c.json(await userservice.gerUserMe(user.id, profile));
  })
  .get(
    "/:id",
    auth,
    zValidator("param", z.object({ id: z.string().uuid() })),
    async (c) => {
      const id = c.req.param("id");
      const user = await userservice.gerUser(id);
      if (!user) {
        return c.text("user not found", 404);
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
        email: z.string(),
        password: z.string(),
        image: z.string().optional().default("/images/default.jpg"),
      })
    ),
    async (c) => {
      const body = c.req.valid("json");
      return c.json(await userservice.addUser(body), 201);
    }
  )
  .delete("/:id", auth, superAdmin, async (c) => {
    const id = c.req.param("id");
    const user = await userservice.deleteUser(id);
    return c.json(user);
  });
