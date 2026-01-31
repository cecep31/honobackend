import { Hono } from "hono";
import { auth } from "../../../middlewares/auth";
import { commentService } from "../../../services/index";
import type { Variables } from "../../../types/context";
import { sendSuccess } from "../../../utils/response";
import { validateRequest } from "../../../middlewares/validateRequest";
import {
  createCommentSchema,
  updateCommentSchema,
  getCommentsQuerySchema,
} from "../validation";

export const commentController = new Hono<{ Variables: Variables }>();

// Create a new comment
commentController.post(
  "/",
  auth,
  validateRequest("json", createCommentSchema),
  async (c) => {
    const { user_id } = c.get("user");
    const data = c.req.valid("json");
    const result = await commentService.createComment(data, user_id);
    return sendSuccess(c, result, "Comment created successfully", 201);
  }
);

// Get comments for a specific post
commentController.get("/post/:post_id", async (c) => {
  const { post_id } = c.req.param();
  const query = c.req.query();
  const validated = getCommentsQuerySchema.parse(query);
  const page = parseInt(validated.page);
  const limit = parseInt(validated.limit);
  
  const result = await commentService.getCommentsByPost(post_id, page, limit);
  return sendSuccess(c, result.data, "Comments fetched successfully", 200, result.meta);
});

// Get replies for a specific comment
commentController.get("/:comment_id/replies", async (c) => {
  const { comment_id } = c.req.param();
  const result = await commentService.getCommentReplies(comment_id);
  return sendSuccess(c, result, "Comment replies fetched successfully");
});

// Get a single comment by ID
commentController.get("/:comment_id", async (c) => {
  const { comment_id } = c.req.param();
  const result = await commentService.getCommentById(comment_id);
  return sendSuccess(c, result, "Comment fetched successfully");
});

// Update a comment
commentController.put(
  "/:comment_id",
  auth,
  validateRequest("json", updateCommentSchema),
  async (c) => {
    const { comment_id } = c.req.param();
    const { user_id } = c.get("user");
    const data = c.req.valid("json");
    const result = await commentService.updateComment(comment_id, data, user_id);
    return sendSuccess(c, result, "Comment updated successfully");
  }
);

// Delete a comment
commentController.delete("/:comment_id", auth, async (c) => {
  const { comment_id } = c.req.param();
  const { user_id } = c.get("user");
  const result = await commentService.deleteComment(comment_id, user_id);
  return sendSuccess(c, result, "Comment deleted successfully");
});

// Get comments by user
commentController.get("/user/:user_id", async (c) => {
  const { user_id } = c.req.param();
  const query = c.req.query();
  const validated = getCommentsQuerySchema.parse(query);
  const page = parseInt(validated.page);
  const limit = parseInt(validated.limit);
  
  const result = await commentService.getCommentsByUser(user_id, page, limit);
  return sendSuccess(c, result.data, "User comments fetched successfully", 200, result.meta);
});
