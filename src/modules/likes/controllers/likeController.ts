import { Hono } from "hono";
import { auth } from "../../../middlewares/auth";
import { likeService } from "../../../services/index";
import type { Variables } from "../../../types/context";
import { sendSuccess } from "../../../utils/response";

export const likeController = new Hono<{ Variables: Variables }>();

likeController.post("/:post_id", auth, async (c) => {
  const { post_id } = c.req.param();
  const { user_id } = c.get("user");
  const result = await likeService.updateLike(post_id, user_id);
  return sendSuccess(c, result, "Like updated successfully");
});

likeController.get("/:post_id", auth, async (c) => {
  const post_id = c.req.param("post_id");
  const result = await likeService.getLikes(post_id);
  return sendSuccess(c, result, "Likes fetched successfully");
});
