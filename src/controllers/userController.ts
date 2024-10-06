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
    return c.json({
      data: users,
      success: true,
      message: "users fetched successfully",
      requestId: c.get("requestId") || "N/A",
    });
  })
  .get("/me", auth, async (c) => {
    const jwtPayload = c.get("jwtPayload") as jwtPayload;
    const profile = Boolean(c.req.query("profile"));
    const user = await userService.gerUserMe(jwtPayload.id, profile);
    return c.json({
      data: user,
      success: true,
      message: "user fetched successfully",
      requestId: c.get("requestId") || "N/A",
    });
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
        message: "user fetched successfully",
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
      const user = await userService.addUser(body);
      return c.json({
        data: user,
        success: true,
        message: "user created successfully",
        requestId: c.get("requestId") || "N/A",
      }, 201);
    }
  )
  .delete("/:id", auth, superAdminMiddleware, async (c) => {
    const id = c.req.param("id");
    const user = await userService.deleteUser(id);
    return c.json({
      data: user,
      success: true,
      message: "user deleted successfully",
      requestId: c.get("requestId") || "N/A",
    });
  });
