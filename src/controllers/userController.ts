import { Hono } from "hono";
import { userService } from "../pkg/service";
import { auth } from "../middlewares/auth";
import { superAdminMiddleware } from "../middlewares/superAdmin";
import { z } from "zod";
import type { jwtPayload } from "../types/auth";
import { validateRequest } from "../middlewares/validateRequest";

export const userController = new Hono()
  .get("/", auth, superAdminMiddleware, async (c) => {
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
    validateRequest("param", z.object({ id: z.string().uuid() })),
    async (c) => {
      const params = c.req.valid("param");
      const user = await userService.gerUser(params.id);
      if (!user) {
        return c.json({ meesage: "usernot found", success: false }, 404);
      }
      return c.json({
        data: user,
        success: true,
        requestId: c.get("requestId") || "N/A",
      });
    }
  )
  .post(
    "/",
    auth,
    superAdminMiddleware,
    validateRequest(
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
  .delete("/:id", auth, superAdminMiddleware, async (c) => {
    const id = c.req.param("id");
    const user = await userService.deleteUser(id);
    return c.json(user);
  });
