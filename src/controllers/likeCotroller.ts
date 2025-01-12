import { Hono } from "hono";
import { auth } from "../middlewares/auth";
import { LikeService } from "../pkg/services/likeService";
import type { Variables } from "../types/context";

const likeController = new Hono<{ Variables: Variables }>();

likeController.post("/:postId", auth, async (c) => {
  const { postId } = c.req.param();
  const { user_id } = c.get("user");
  return c.json(await LikeService.updateLike(postId, user_id));
});
likeController.get("/:post_id", auth, async (c) => {
  const post_id = c.req.param("post_id");
  return c.json(await LikeService.getLikes(post_id));
});

export default likeController;
