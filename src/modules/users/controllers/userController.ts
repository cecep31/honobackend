import { Hono } from "hono";
import { userService } from "../../../services/index";
import { auth } from "../../../middlewares/auth";
import { superAdminMiddleware } from "../../../middlewares/superAdmin";
import { validateRequest } from "../../../middlewares/validateRequest";
import type { Variables } from "../../../types/context";
import { getPaginationParams } from "../../../utils/paginate";
import { sendSuccess } from "../../../utils/response";
import { Errors } from "../../../utils/error";
import {
  createUserSchema,
  updateUserSchema,
  userIdSchema,
  updateProfileSchema,
  updateUserImageSchema
} from "../validation/user";

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
   * PATCH /users/me/profile - Update current authenticated user's profile
   */
  .patch(
    "/me/profile",
    auth,
    validateRequest("json", updateProfileSchema),
    async (c) => {
      const authUser = c.get("user");
      const body = c.req.valid("json");
      const profile = await userService.updateProfile(authUser.user_id, body);
      return sendSuccess(c, profile, "Profile updated successfully");
    }
  )

  /**
   * PATCH /users/me - Update current authenticated user's username/email
   */
  .patch(
    "/me",
    auth,
    validateRequest("json", updateUserSchema),
    async (c) => {
      const authUser = c.get("user");
      const body = c.req.valid("json");
      await userService.updateUser(authUser.user_id, body);
      return sendSuccess(c, null, "User updated successfully");
    }
  )

  /**
   * PATCH /users/me/image - Update current authenticated user's profile image
   */
  .patch(
    "/me/image",
    auth,
    validateRequest("form", updateUserImageSchema),
    async (c) => {
      const authUser = c.get("user");
      const { image } = c.req.valid("form");

      const updatedUser = await userService.updateUserImage(authUser.user_id, image);
      return sendSuccess(c, updatedUser, "Profile image updated successfully");
    }
  )

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
  )

  /**
   * POST /users/:id/follow - Follow a user
   */
  .post(
    "/:id/follow",
    auth,
    validateRequest("param", userIdSchema),
    async (c) => {
      const authUser = c.get("user");
      const { id: following_id } = c.req.valid("param");

      if (authUser.user_id === following_id) {
        throw Errors.BusinessRuleViolation("Cannot follow yourself");
      }

      const follow = await userService.followUser(authUser.user_id, following_id);
      return sendSuccess(c, follow, "User followed successfully", 201);
    }
  )

  /**
   * DELETE /users/:id/follow - Unfollow a user
   */
  .delete(
    "/:id/follow",
    auth,
    validateRequest("param", userIdSchema),
    async (c) => {
      const authUser = c.get("user");
      const { id: following_id } = c.req.valid("param");

      const unfollow = await userService.unfollowUser(authUser.user_id, following_id);
      return sendSuccess(c, unfollow, "User unfollowed successfully");
    }
  )

  /**
   * GET /users/:id/followers - Get user's followers
   */
  .get(
    "/:id/followers",
    auth,
    validateRequest("param", userIdSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const params = getPaginationParams(c);
      const { data, meta } = await userService.getFollowers(id, params);
      return sendSuccess(c, data, "Followers fetched successfully", 200, meta);
    }
  )

  /**
   * GET /users/:id/following - Get users that this user is following
   */
  .get(
    "/:id/following",
    auth,
    validateRequest("param", userIdSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const params = getPaginationParams(c);
      const { data, meta } = await userService.getFollowing(id, params);
      return sendSuccess(c, data, "Following fetched successfully", 200, meta);
    }
  )

  /**
   * GET /users/:id/is-following - Check if authenticated user is following this user
   */
  .get(
    "/:id/is-following",
    auth,
    validateRequest("param", userIdSchema),
    async (c) => {
      const authUser = c.get("user");
      const { id: following_id } = c.req.valid("param");

      const isFollowing = await userService.isFollowing(authUser.user_id, following_id);
      return sendSuccess(c, { isFollowing }, "Follow status checked successfully");
    }
  );
