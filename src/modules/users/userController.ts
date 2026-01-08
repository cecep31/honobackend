import { Hono } from "hono";
import { userService } from "../../services/index";
import { auth } from "../../middlewares/auth";
import { superAdminMiddleware } from "../../middlewares/superAdmin";
import { validateRequest } from "../../middlewares/validateRequest";
import type { Variables } from "../../types/context";
import { getPaginationParams } from "../../utils/paginate";
import { sendSuccess } from "../../utils/response";
import { Errors } from "../../utils/error";
import {
  createUserSchema,
  updateUserSchema,
  userIdSchema
} from "./validation/user";

export const userController = new Hono<{ Variables: Variables }>()
  /**
   * GET /users - Get all users (admin only)
   */
  .get("/", auth, superAdminMiddleware, async (c) => {
    const params = getPaginationParams(c);
    const { data, meta } = await userService.getUsers(params);
    return sendSuccess(c, data, "Users fetched successfully", 200, meta);
  })

  /**
   * GET /users/me - Get current authenticated user's profile
   */
  .get("/me", auth, async (c) => {
    const authUser = c.get("user");
    const profile = Boolean(c.req.query("profile"));
    const user = await userService.getUserMe(authUser.user_id, profile);
    
    if (!user) {
      throw Errors.NotFound("User");
    }
    
    return sendSuccess(c, user, "User profile fetched successfully");
  })

  /**
   * GET /users/:id - Get user by ID
   */
  .get("/:id", auth, validateRequest("param", userIdSchema), async (c) => {
    const params = c.req.valid("param");
    const user = await userService.getUser(params.id);
    
    if (!user) {
      throw Errors.NotFound("User");
    }
    
    return sendSuccess(c, user, "User fetched successfully");
  })

  /**
   * POST /users - Create new user (admin only)
   */
  .post(
    "/",
    auth,
    superAdminMiddleware,
    validateRequest("json", createUserSchema),
    async (c) => {
      const body = c.req.valid("json");
      const user = await userService.addUser(body);
      return sendSuccess(c, user, "User created successfully", 201);
    }
  )

  /**
   * PATCH /users/:id - Update user (admin only)
   */
  .patch(
    "/:id",
    auth,
    superAdminMiddleware,
    validateRequest("param", userIdSchema),
    validateRequest("json", updateUserSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const user = await userService.updateUser(id, body);
      return sendSuccess(c, user, "User updated successfully");
    }
  )

  /**
   * DELETE /users/:id - Soft delete user (admin only)
   */
  .delete(
    "/:id",
    auth,
    superAdminMiddleware,
    validateRequest("param", userIdSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const user = await userService.deleteUser(id);
      return sendSuccess(c, user, "User deleted successfully");
    }
  );
