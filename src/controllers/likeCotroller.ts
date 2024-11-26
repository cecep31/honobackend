import { Hono } from "hono";
import { auth } from "../middlewares/auth";
import { LikeService } from "../pkg/services/likeService";
import type { jwtPayload } from "../types/auth";

const likeController = new Hono();
likeController.post("/:postId", auth, async (c) => {
  const { postId } = c.req.param();
  const { id: userId } = c.get("jwtPayload") as jwtPayload;
  return c.json(await LikeService.updateLike(postId, userId));
});
likeController.get("/:post_id", auth, async (c) => {
  const post_id = c.req.param("post_id");
  return c.json(await LikeService.getLikes(post_id));
});

export default likeController;
