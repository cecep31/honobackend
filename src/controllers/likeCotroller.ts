import { Hono } from "hono";
import { auth } from "../middlewares/auth";
import { LikeService } from "../pkg/services/likeService";
import type { jwtPayload } from "../types/auth";

const likeController = new Hono();
likeController.post("/:post_id", auth, async (c) => {
  const post_id = c.req.param("post_id");
  const user = c.get("jwtPayload") as jwtPayload;
  return c.json(await LikeService.updateLike(post_id, user.id));
});
likeController.get("/:post_id", auth, async (c) => {
  const post_id = c.req.param("post_id");
  return c.json(await LikeService.getLikes(post_id));
});

export default likeController;
